const {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = async function registrarComandos() {

    const commands = [

        new SlashCommandBuilder()
            .setName("configurar-pix")
            .setDescription("Configura a chave PIX do bot.")
            .addStringOption(option =>
                option
                    .setName("chave")
                    .setDescription("Chave PIX")
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Verifica se o bot está online."),

        new SlashCommandBuilder()
            .setName("criar-rifa")
            .setDescription("Criar uma nova rifa.")
            .addStringOption(option =>
                option
                    .setName("premio")
                    .setDescription("Nome do prêmio")
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option
                    .setName("valor")
                    .setDescription("Valor de cada número")
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName("quantidade")
                    .setDescription("Quantidade total de números")
                    .setMinValue(1)
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName("meta")
                    .setDescription("Quantidade de números pagos para liberar o sorteio")
                    .setMinValue(1)
                    .setRequired(false)
            ),

        new SlashCommandBuilder()
            .setName("configurar-meta")
            .setDescription("Define ou altera a meta de uma rifa.")
            .addIntegerOption(option =>
                option
                    .setName("rifa")
                    .setDescription("ID da rifa")
                    .setMinValue(1)
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName("meta")
                    .setDescription("Nova meta de números pagos")
                    .setMinValue(1)
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("meus-numeros")
            .setDescription("Mostra seus números.")
            .addIntegerOption(option =>
                option
                    .setName("rifa")
                    .setDescription("ID da rifa")
                    .setMinValue(1)
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("confirmar-pagamento")
            .setDescription("Confirma o pagamento de um participante.")
            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )
            .addUserOption(option =>
                option
                    .setName("usuario")
                    .setDescription("Usuário")
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName("rifa")
                    .setDescription("ID da rifa")
                    .setMinValue(1)
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("sortear")
            .setDescription("Realiza o sorteio da rifa.")
            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )
            .addIntegerOption(option =>
                option
                    .setName("rifa")
                    .setDescription("ID da rifa")
                    .setMinValue(1)
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("painel-admin")
            .setDescription("Abre o painel administrativo de uma rifa.")
            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )
            .addIntegerOption(option =>
                option
                    .setName("rifa")
                    .setDescription("ID da rifa")
                    .setMinValue(1)
                    .setRequired(true)
            )

    ].map(command => command.toJSON());

    const rest = new REST({
        version: "10"
    }).setToken(process.env.TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.CLIENT_ID,
            process.env.GUILD_ID
        ),
        {
            body: commands
        }
    );

};
