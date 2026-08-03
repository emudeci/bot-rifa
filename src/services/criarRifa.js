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

                const blocos = 10;
                const preenchidos = 0;
                const barra =
                    "🟥".repeat(preenchidos) +
                    "⬜".repeat(blocos - preenchidos);

                const embed = new EmbedBuilder()
                    .setTitle("🎟 Nova Rifa")
                    .setDescription(
                        `**${premio}**\n\n` +
                        `**Progresso para o sorteio**\n` +
                        `${barra}\n` +
                        `**0% concluído — faltam 100%**`
                    )
                    .addFields(
                        {
                            name: "💰 Valor",
                            value: `R$ ${Number(valor)
                                .toFixed(2)
                                .replace(".", ",")}`,
                            inline: true
                        },
                        {
                            name: "🎟 Total",
                            value: quantidade.toString(),
                            inline: true
                        },
                        {
                            name: "🎯 Meta",
                            value: meta.toString(),
                            inline: true
                        },
                        {
                            name: "✅ Números pagos",
                            value: `0/${meta}`,
                            inline: true
                        },
                        {
                            name: "👥 Compradores",
                            value: "0",
                            inline: true
                        },
                        {
                            name: "📊 Status",
                            value: `🔴 Faltam ${meta} números`,
                            inline: true
                        }
                    )
                    .setColor("Red")
                    .setFooter({
                        text: `Rifa #${rifaId}`
                    })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`comprar_${rifaId}`)
                        .setLabel("Comprar Número")
                        .setEmoji("🎟")
                        .setStyle(ButtonStyle.Success)
                );

                interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                })
                    .then((msg) => {
                        db.run(
                            `
                            UPDATE rifas
                            SET canal_id=?, mensagem_id=?
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
                                        content: "⚠️ Rifa criada, mas ocorreu um erro ao salvar a mensagem."
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
                            content: "❌ Erro ao enviar a mensagem da rifa."
                        });
                    });
            });
        }
    );
};