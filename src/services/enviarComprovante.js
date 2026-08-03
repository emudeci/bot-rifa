const db = require("../database/database");

module.exports = async (client, interaction) => {

    const rifaId = Number(interaction.customId.split("_")[2]);

    const link = interaction.fields.getTextInputValue("link");

    db.run(
        `
        UPDATE pagamentos
        SET comprovante=?
        WHERE
            rifa_id=?
            AND usuario_id=?
            AND status='pendente'
        `,
        [
            link,
            rifaId,
            interaction.user.id
        ],
        async (err) => {

            if (err) {
                console.error(err);

                return interaction.reply({
                    content: "Erro ao enviar comprovante.",
                    ephemeral: true
                });
            }

            const canal = await client.channels.fetch(process.env.CANAL_COMPROVANTES);

            await canal.send({
                content:
`📄 Novo comprovante

👤 ${interaction.user}

🎟 Rifa: ${rifaId}

🔗 ${link}`
            });

            interaction.reply({
                content: "✅ Comprovante enviado para análise.",
                ephemeral: true
            });

        }
    );

};