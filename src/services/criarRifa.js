const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

module.exports = async (client, interaction) => {

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    const premio = interaction.options.getString("premio");
    const valor = interaction.options.getNumber("valor");
    const quantidade = interaction.options.getInteger("quantidade");
    const metaInformada = interaction.options.getInteger("meta");

    const meta = metaInformada ?? quantidade;

    if (meta < 1) {
        return interaction.editReply({
            content: "❌ A meta deve ser maior que zero."
        });
    }

    if (meta > quantidade) {
        return interaction.editReply({
            content: "❌ A meta não pode ser maior que a quantidade total de números."
        });
    }

    db.run(
        `
        INSERT INTO rifas
        (premio, valor, quantidade, meta, criador_id)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            premio,
            valor,
            quantidade,
            meta,
            interaction.user.id
        ],
        function (err) {

            if (err) {
                console.error(err);

                return interaction.editReply({
                    content: "❌ Erro ao criar a rifa."
                });
            }

            const rifaId = this.lastID;

            const stmt = db.prepare(`
                INSERT INTO numeros
                (rifa_id, numero)
                VALUES (?, ?)
            `);

            for (let i = 1; i <= quantidade; i++) {
                stmt.run(rifaId, i);
            }

            stmt.finalize((err) => {

                if (err) {
                    console.error(err);

                    return interaction.editReply({
                        content: "❌ Erro ao criar os números da rifa."
                    });
                }

                const barra =
                    "⬜".repeat(10);

                const embed =
                    new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("🎟 Nova Rifa")
                        .setDescription(
                            `**${premio}**\n\n` +
                            `${barra}\n` +
                            `**0% concluído**`
                        )
                        .addFields(
                            {
                                name: "💰 Valor",
                                value:
                                    `R$ ${Number(valor)
                                        .toFixed(2)
                                        .replace(".", ",")}`,
                                inline: true
                            },
                            {
                                name: "🎟 Total",
                                value: `${quantidade}`,
                                inline: true
                            },
                            {
                                name: "🎯 Meta",
                                value: `${meta}`,
                                inline: true
                            },
                            {
                                name: "✅ Pagos",
                                value: `0/${meta}`,
                                inline: true
                            },
                            {
                                name: "📈 Progresso",
                                value: "0%",
                                inline: true
                            },
                            {
                                name: "⏳ Falta",
                                value: `${meta} números`,
                                inline: false
                            },
                            {
                                name: "🎉 Sorteio",
                                value: "🔴 Aguardando meta",
                                inline: false
                            }
                        )
                        .setFooter({
                            text: `Rifa #${rifaId}`
                        })
                        .setTimestamp();

                const row =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `comprar_${rifaId}`
                                )
                                .setLabel("Comprar")
                                .setEmoji("🎟")
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `disponiveis_${rifaId}_1`
                                )
                                .setLabel("Ver disponíveis")
                                .setEmoji("🔎")
                                .setStyle(
                                    ButtonStyle.Secondary
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `comprovante_${rifaId}`
                                )
                                .setLabel("Enviar Comprovante")
                                .setEmoji("📄")
                                .setStyle(
                                    ButtonStyle.Primary
                                )
                        );

                interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                })
                    .then((msg) => {

                        db.run(
                            `
                            UPDATE rifas
                            SET
                                canal_id=?,
                                mensagem_id=?
                            WHERE id=?
                            `,
                            [
                                interaction.channel.id,
                                msg.id,
                                rifaId
                            ],
                            async (err) => {

                                if (err) {
                                    console.error(err);

                                    return interaction.editReply({
                                        content:
                                            "⚠️ Rifa criada, mas ocorreu um erro ao salvar a mensagem."
                                    });
                                }

                                await interaction.editReply({
                                    content:
                                        `✅ Rifa criada com sucesso!\n` +
                                        `🎯 Meta: ${meta} números pagos.`
                                });
                            }
                        );
                    })
                    .catch(async (err) => {

                        console.error(err);

                        await interaction.editReply({
                            content:
                                "❌ Erro ao enviar a mensagem da rifa."
                        });
                    });
            });
        }
    );
};
