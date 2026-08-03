const { MessageFlags, PermissionFlagsBits } = require("discord.js");

const db = require("../database/database");
const atualizarEmbed = require("./atualizarEmbed")

module.exports = (client, interaction) => {

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: "❌ Apenas administradores.",
            flags: MessageFlags.Ephemeral
        });
    }

    const usuario = interaction.options.getUser("usuario");
    const rifaId = interaction.options.getInteger("rifa");

    db.run(
        `
        UPDATE numeros
        SET
            status='pago',
            pago_em=datetime('now')
        WHERE
            rifa_id=?
            AND usuario_id=?
            AND status='reservado'
        `,
        [
            rifaId,
            usuario.id
        ],
        function (err) {

            if (err) {
                console.error(err);

                return interaction.reply({
                    content: "❌ Erro ao confirmar os números.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (this.changes === 0) {
                return interaction.reply({
                    content: "❌ Nenhuma reserva encontrada.",
                    flags: MessageFlags.Ephemeral
                });
            }

            db.run(
                `
                UPDATE pagamentos
                SET status='aprovado'
                WHERE id=(
                    SELECT id
                    FROM pagamentos
                    WHERE
                        rifa_id=?
                        AND usuario_id=?
                        AND status='pendente'
                    ORDER BY id DESC
                    LIMIT 1
                )
                `,
                [
                    rifaId,
                    usuario.id
                ],
                async (err) => {

                    if (err) {
                        console.error(err);

                        return interaction.reply({
                            content: "❌ Erro ao atualizar o pagamento.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    await atualizarEmbed(client, rifaId);

                    return interaction.reply({
                        content: `✅ Pagamento confirmado para ${usuario}.`
                    });
                }
            );
        }
    );
};