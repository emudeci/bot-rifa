const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../database/database");

module.exports = async (client, message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const topico = message.channel.topic;

    if (!topico || !topico.startsWith("pagamento:")) {
        return;
    }

    const pagamentoId = Number(
        topico
            .split("|")[0]
            .replace("pagamento:", "")
            .trim()
    );

    if (!pagamentoId) return;

    const anexo = message.attachments.first();

    if (!anexo) {
        return;
    }

    db.get(
        `
        SELECT *
        FROM pagamentos
        WHERE id=?
        `,
        [pagamentoId],
        async (err, pagamento) => {
            if (err) {
                console.error("Erro ao buscar pagamento:", err);
                return;
            }

            if (!pagamento) {
                return message.reply(
                    "❌ Pagamento não encontrado."
                );
            }

            if (
                String(message.author.id) !==
                String(pagamento.usuario_id)
            ) {
                return;
            }

            if (
                pagamento.status === "aprovado" ||
                pagamento.status === "recusado" ||
                pagamento.status === "cancelado"
            ) {
                return;
            }

            const nome = anexo.name || "comprovante";
            const tipo = anexo.contentType || "";
            const nomeMinusculo = nome.toLowerCase();

            const imagem =
                tipo.startsWith("image/") ||
                nomeMinusculo.endsWith(".png") ||
                nomeMinusculo.endsWith(".jpg") ||
                nomeMinusculo.endsWith(".jpeg") ||
                nomeMinusculo.endsWith(".webp") ||
                nomeMinusculo.endsWith(".gif");

            const pdf =
                tipo === "application/pdf" ||
                nomeMinusculo.endsWith(".pdf");

            if (!imagem && !pdf) {
                return message.reply(
                    "❌ O comprovante deve ser uma imagem ou PDF."
                );
            }

            db.run(
                `
                UPDATE pagamentos
                SET
                    comprovante=?,
                    comprovante_nome=?,
                    comprovante_url=?,
                    comprovante_tipo=?,
                    status='analise'
                WHERE id=?
                `,
                [
                    anexo.url,
                    nome,
                    anexo.url,
                    tipo || (pdf ? "application/pdf" : "image"),
                    pagamentoId
                ],
                function (err) {
                    if (err) {
                        console.error(
                            "Erro ao salvar comprovante:",
                            err
                        );

                        return message.reply(
                            "❌ Erro ao salvar o comprovante."
                        );
                    }

                    db.all(
                        `
                        SELECT numero
                        FROM numeros
                        WHERE pagamento_id=?
                        ORDER BY numero ASC
                        `,
                        [pagamentoId],
                        async (err, numeros) => {
                            if (err) {
                                console.error(
                                    "Erro ao buscar números:",
                                    err
                                );

                                return message.reply(
                                    "❌ Erro ao buscar os números."
                                );
                            }
const listaNumeros = numeros.map((item) =>
    String(item.numero).padStart(3, "0")
);

const partesNumeros = [];
let parteAtual = "";

for (const numero of listaNumeros) {
    const texto = parteAtual
        ? `, ${numero}`
        : numero;

    if ((parteAtual + texto).length > 1000) {
        partesNumeros.push(parteAtual);
        parteAtual = numero;
    } else {
        parteAtual += texto;
    }
}

if (parteAtual) {
    partesNumeros.push(parteAtual);
}

if (partesNumeros.length === 0) {
    partesNumeros.push("Nenhum");
}

/*
Limita a quantidade de campos para não ultrapassar
o máximo de 25 campos por embed.
*/
const partesExibidas = partesNumeros.slice(0, 20);

const camposNumeros = partesExibidas.map((parte, index) => ({
    name: index === 0
        ? `🎟 Números (${listaNumeros.length})`
        : `🎟 Números — continuação ${index + 1}`,
    value: String(parte)
}));

if (partesNumeros.length > partesExibidas.length) {
    camposNumeros.push({
        name: "⚠️ Lista muito grande",
        value: `Existem ${listaNumeros.length} números vinculados a este pagamento.`
    });
}

const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle(`💳 Comprovante #${pagamentoId}`)
    .addFields(
        {
            name: "👤 Comprador",
            value: `<@${pagamento.usuario_id}>`
        },
        ...camposNumeros,
        {
            name: "💰 Valor",
            value: `R$ ${Number(pagamento.valor || 0)
                .toFixed(2)
                .replace(".", ",")}`
        },
        {
            name: "📎 Arquivo",
            value: `[Abrir comprovante](${anexo.url})`
        }
    )
                                .setFooter({
                                    text: "Aguardando análise administrativa"
                                })
                                .setTimestamp();

                            if (imagem) {
                                embed.setImage(anexo.url);
                            }

                            const botoes =
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            `aprovar_${pagamentoId}`
                                        )
                                        .setLabel(
                                            "Confirmar pagamento"
                                        )
                                        .setEmoji("✅")
                                        .setStyle(
                                            ButtonStyle.Success
                                        ),

                                    new ButtonBuilder()
                                        .setCustomId(
                                            `recusar_${pagamentoId}`
                                        )
                                        .setLabel(
                                            "Recusar pagamento"
                                        )
                                        .setEmoji("❌")
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                );

                            await message.reply({
                                content: process.env.CARGO_ADMIN
                                    ? `<@&${process.env.CARGO_ADMIN}>`
                                    : "📄 Comprovante enviado para análise.",
                                allowedMentions: {
                                    roles: process.env.CARGO_ADMIN
                                        ? [process.env.CARGO_ADMIN]
                                        : []
                                },
                                embeds: [embed],
                                components: [botoes]
                            });
                        }
                    );
                }
            );
        }
    );
};