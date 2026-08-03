const { MessageFlags, PermissionFlagsBits } = require("discord.js");

const db = require("../database/database");

module.exports = (interaction) => {

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {

        return interaction.reply({
            content: "❌ Apenas administradores.",
            flags: MessageFlags.Ephemeral
        });

    }

    const chave = interaction.options.getString("chave");

    db.run(
        `
        INSERT OR REPLACE INTO config
        (
            chave,
            valor
        )
        VALUES
        (
            'pix',
            ?
        )
        `,
        [chave]
    );

    interaction.reply({
        content: "✅ Chave PIX salva com sucesso.",
        flags: MessageFlags.Ephemeral
    });

};