const {
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");
const atualizarEmbed = require("./atualizarEmbed")

module.exports = async (client, interaction) => {
    if (
        process.env.CARGO_ADMIN &&
        !interaction.member.roles.cache.has(
            process.env.CARGO_ADMIN
        ) &&
        !interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return interaction.reply({
            content: "❌ Você não pode aprovar pagamentos.",
            flags: MessageFlags.Ephemeral
        });
    }

    const pagamentoId = Number(
        interaction.customId.split("_")[1]
    );

    await interaction.deferUpdate();

    db.get(
        `
        SELECT *
        FROM pagamentos
        WHERE id=?
        `,
        [pagamentoId],
        (err, pagamento) => {
            if (err || !pagamento) {
                return interaction.editReply({
                    content: "❌ Pagamento não encontrado.",
                    embeds: [],
                    components: []
                });
            }

            if (pagamento.status === "aprovado") {
                return interaction.editReply({
                    content: "✅ Este pagamento já foi aprovado.",
                    embeds: [],
                    components: []
                });
            }

            if (
                pagamento.status === "recusado" ||
                pagamento.status === "cancelado"
            ) {
                return interaction.editReply({
                    content: "❌ Este pagamento já foi encerrado.",
                    embeds: [],
                    components: []
                });
            }

            db.run(
                `
                UPDATE pagamentos
                SET
                    status='aprovado',
                    aprovado_em=datetime('now')
                WHERE id=?
                `,
                [pagamentoId],
                (err) => {
                    if (err) {
                        console.error(err);

                        return interaction.editReply({
                            content: "❌ Erro ao aprovar pagamento.",
                            embeds: [],
                            components: []
                        });
                    }

                    db.run(
                        `
                        UPDATE numeros
                        SET
                            status='pago',
                            pago_em=datetime('now')
                        WHERE pagamento_id=?
                        `,
                        [pagamentoId],
                        async (err) => {
                            if (err) {
                                console.error(err);

                                return interaction.editReply({
                                    content: "❌ Erro ao confirmar os números.",
                                    embeds: [],
                                    components: []
                                });
                            }

                            await atualizarEmbed(
                                client,
                                pagamento.rifa_id
                            );

                            const canal = interaction.channel;

                            await interaction.editReply({
                                content:
`✅ Pagamento aprovado por ${interaction.user}.

Os números desta compra foram confirmados e permanecem salvos.

🔒 Este ticket será fechado em 7 segundos.`,
                                embeds: [],
                                components: []
                            });

                            const usuario = await client.users
                                .fetch(pagamento.usuario_id)
                                .catch(() => null);

                            if (usuario) {
                                await usuario.send(
                                    `✅ Seu pagamento #${pagamentoId} foi aprovado. Seus números estão confirmados.`
                                ).catch(() => null);
                            }

                            setTimeout(async () => {
                                await canal.delete(
                                    "Pagamento aprovado"
                                ).catch(console.error);
                            }, 7000);
                        }
                    );
                }
            );
        }
    );
};