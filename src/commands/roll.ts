import { Colors, EmbedBuilder, SlashCommandBuilder, codeBlock, inlineCode } from 'discord.js';
import { commands } from '.';
import { DiceRoller } from 'dice-roller-parser';
import { inspect } from 'bun';
import { useTry } from '../util';

const roller = new DiceRoller();

commands.push({
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a dice expression')
        .addStringOption((option) =>
            option.setName('expression').setDescription('The expression to evaluate').setRequired(true),
        )
        .addBooleanOption((option) =>
            option
                .setName('private')
                .setDescription('Respond as a whisper instead of a public message')
                .setRequired(false),
        )
        .addNumberOption((option) =>
            option
                .setName('iterations')
                .setDescription('The amount of times to roll the expression (ignored if `raw` option is True)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25),
        )
        .addBooleanOption((option) =>
            option
                .setName('raw')
                .setDescription('Display the raw output object instead of a stylized message')
                .setRequired(false),
        ),

    async execute(interaction) {
        const expression = interaction.options.getString('expression', true);
        const ephemeral = interaction.options.getBoolean('private') ?? false;
        const shouldDisplayRaw = interaction.options.getBoolean('raw') ?? false;
        const iterations = shouldDisplayRaw ? 1 : interaction.options.getNumber('iterations') ?? 1;

        const [error, parsed] = useTry(() => roller.parse(expression));

        if (!parsed) {
            if ((error as any).name !== 'SyntaxError') throw error;

            if (shouldDisplayRaw) {
                delete (error as any).stack;
                delete (error as any).toString;
                return await interaction.reply({ content: codeBlock('ts', inspect(error)), ephemeral });
            }

            const message = (error as any).message;
            const embed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle('Syntax Error')
                .setDescription(codeBlock(expression) + codeBlock('json', message));
            return await interaction.reply({
                embeds: [embed],
                ephemeral,
            });
        }

        const results = Array(iterations)
            .fill(undefined)
            .map(() => roller.rollParsed(parsed));

        if (shouldDisplayRaw) {
            return await interaction.reply({ content: codeBlock('ts', inspect(results[0])), ephemeral });
        }

        const embed = new EmbedBuilder().setColor(
            interaction.inCachedGuild() ? interaction.member.displayColor : interaction.user.accentColor ?? null,
        );
        if (results.length === 1) {
            embed.setTitle(`${inlineCode(expression)}   =   ${results[0].value}`);
        } else {
            embed.setTitle(`${inlineCode(expression)}   (${results.length} Iterations)`).setFields(
                {
                    name: 'Total',
                    value: results.map((_, i) => `#${i + 1}`).join('\n'),
                    inline: true,
                },
                {
                    name: `${results.reduce((acc, roll) => acc + roll.value, 0)}`,
                    value: results.map((roll) => `**${roll.value}**`).join('\n'),
                    inline: true,
                },
            );
        }

        await interaction.reply({ embeds: [embed], ephemeral });
    },
});
