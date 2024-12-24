require('dotenv').config();
const { Client, IntentsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getNotionData, getNotionDocs } = require('./notion');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

// Store docs lists for interactions
const interactionDocsMap = new Map();

// Logs when the bot is online
client.on('ready', async () => {
    console.log(`${client.user.tag} is online.`);

    const guildId = process.env.GUILD_ID;  // Use .env for Guild ID
    const guild = client.guilds.cache.get(guildId);

    if (guild) {
        // Register commands
        await guild.commands.create({
            name: 'events',
            description: 'Fetch and display a list of upcoming events from Notion',
        });

        await guild.commands.create({
            name: 'docs',
            description: 'Fetch and display a list of documents from Notion',
        });

        console.log('Commands registered successfully!');
    } else {
        console.error('Guild not found! Make sure your bot is in the server.');
    }
});

// Slash commands implementation
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    // Log interaction details for debugging
    console.log('Interaction received:', interaction);

    if (interaction.isChatInputCommand()) {
        await interaction.deferReply();  // Defer the reply immediately

        if (interaction.commandName === 'events') {
            try {
                const upcomingEvents = await getNotionData();
                if (upcomingEvents.length > 0) {
                    await interaction.editReply(`Upcoming events:\n${upcomingEvents.join('\n')}`);
                } else {
                    await interaction.editReply('No upcoming events found in Notion.');
                }
            } catch (error) {
                console.error('Error in /events command:', error);
                await interaction.editReply({
                    content: `There was an error fetching events from Notion: ${error.message}`,
                    ephemeral: true,
                });
            }
        }

        if (interaction.commandName === 'docs') {
            try {
                const docsList = await getNotionDocs();
                if (docsList.length === 0) {
                    await interaction.editReply('No docs available.');
                    return;
                }

                const options = docsList.map((doc, index) => ({
                    label: doc.title,
                    value: String(index),
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('selectDoc')
                        .setPlaceholder('Choose a document')
                        .addOptions(options)
                );

                await interaction.editReply({
                    content: 'Select a document from the list:',
                    components: [row],
                });

                // Store docsList in the map with the interaction ID
                interactionDocsMap.set(interaction.id, docsList); 
            } catch (error) {
                console.error('Error in /docs command:', error);
                await interaction.editReply({
                    content: `There was an error fetching docs from Notion: ${error.message}`,
                    ephemeral: true,
                });
            }
        }
    }

    // Handle document selection
    if (interaction.isStringSelectMenu() && interaction.customId === 'selectDoc') {
        try {
            // Retrieve the docsList using the interaction ID
            const docsList = interactionDocsMap.get(interaction.message.interaction.id);
            const selectedDocIndex = interaction.values[0];
            const selectedDoc = docsList[selectedDocIndex]; 

            // Send a new reply with the document URL
            await interaction.reply({
                content: `You selected: [${selectedDoc.title}](${selectedDoc.url})`,
                ephemeral: true, // Makes the message visible only to the user who made the selection
            });
        } catch (error) {
            console.error('Error handling doc selection:', error);
            await interaction.reply({
                content: `There was an error fetching the selected doc: ${error.message}`,
                ephemeral: true,
            });
        }
    }
});

// Bot token from .env file to secure token access
client.login(process.env.TOKEN);
