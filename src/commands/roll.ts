import { Colors, EmbedBuilder, SlashCommandBuilder, bold, codeBlock, inlineCode } from 'discord.js';
import { commands } from '.';
import { DiceRoller, DiscordRollRenderer } from 'dice-roller-parser';
import { inspect } from 'bun';
import { useTry } from '../util';

const roller = new DiceRoller();
const renderer = new DiscordRollRenderer();

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
            const [tray, value] = renderer
                .render(results[0])
                .split('=')
                .map((it) => it.trim());

            embed.setTitle(`${expression} (${tray})  =  ${inlineCode(value)}`);
        } else {
            const rendered = results.map((roll) => {
                const [tray, value] = renderer
                    .render(roll)
                    .split('=')
                    .map((it) => it.trim());
                return { tray, value };
            });

            const padding = rendered.reduce((acc, { value }) => Math.max(acc, value.length), 0);

            const content = rendered
                .map((roll) => {
                    const value = inlineCode(roll.value.padStart(padding, '0'));
                    return `${value}  »  ${roll.tray}`;
                })
                .join('\n');

            embed.setTitle(`${expression} (${results.length} Iterations)`).setDescription(content);
        }

        await interaction.reply({ embeds: [embed], ephemeral });
    },
});
