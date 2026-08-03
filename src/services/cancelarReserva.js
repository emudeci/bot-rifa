const { MessageFlags } = require("discord.js");

const db = require("../database/database");
const atualizarEmbed = require("./atualizarEmbed")

module.exports = async (client, interaction) => {

    const pagamentoId = Number(
        interaction.customId.split("_")[1]
    );

    db.get(
        `
        SELECT *
        FROM pagamentos
        WHERE id=?
        AND usuario_id=?
        AND status='pendente'
        `,
        [
            pagamentoId,
            interaction.user.id
        ],
        (err, pagamento) => {

            if (err) {
                console.error(err);

                return interaction.reply({
                    content: "❌ Erro ao buscar o pagamento.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!pagamento) {
                return interaction.reply({
                    content: "❌ Reserva não encontrada ou já finalizada.",
                    flags: MessageFlags.Ephemeral
                });
            }

            db.all(
                `
                SELECT numero
                FROM numeros
                WHERE rifa_id=?
                AND usuario_id=?
                AND status='reservado'
                `,
                [
                    pagamento.rifa_id,
                    interaction.user.id
                ],
                (err, numeros) => {

                    if (err) {
                        console.error(err);

                        return interaction.reply({
                            content: "❌ Erro ao buscar os números.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const quantidade = numeros.length;

                    db.run(
                        `
                        UPDATE numeros
                        SET
                            usuario_id=NULL,
                            status='livre',
                            reservado_em=NULL
                        WHERE rifa_id=?
                        AND usuario_id=?
                        AND status='reservado'
                        `,
                        [
                            pagamento.rifa_id,
                            interaction.user.id
                        ],
                        (err) => {

                            if (err) {
                                console.error(err);

                                return interaction.reply({
                                    content: "❌ Erro ao cancelar a reserva.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            db.run(
                                `
                                UPDATE pagamentos
                                SET status='cancelado'
                                WHERE id=?
                                `,
                                [pagamentoId]
                            );

                            db.run(
                                `
                                UPDATE rifas
                                SET vendidos = MAX(vendidos - ?, 0)
                                WHERE id=?
                                `,
                                [
                                    quantidade,
                                    pagamento.rifa_id
                                ],
                                async () => {

                                    await atualizarEmbed(
                                        client,
                                        pagamento.rifa_id
                                    );

                                    return interaction.update({
                                        content: "❌ Reserva cancelada.",
                                        components: []
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};