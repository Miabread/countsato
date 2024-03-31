import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBooleanOption } from 'discord.js';

new SlashCommandBooleanOption().setName('').setDescription('');

type RequiredPredicate<Required extends boolean, T> = Required extends true ? T : T | null;

type AddOptionToContext<Type extends keyof OptionTypeResolvable, Name extends string, Required extends boolean> = {
    readonly options: { readonly [N in Name]: RequiredPredicate<Required, OptionTypeResolvable[Type]> };
};

interface BaseContext {
    interaction: ChatInputCommandInteraction;
}

class CommandBuilder<Context extends BaseContext> {
    private constructor(private prepareCallback: PrepareCallback<Context>) {}

    public static start(): CommandBuilder<BaseContext> {
        return new CommandBuilder((context) => context);
    }

    public derive<const Extra extends object>(callback: (context: Context) => Extra): CommandBuilder<Context & Extra> {
        return new CommandBuilder((baseContext) => {
            const context = this.prepareCallback(baseContext);
            // TODO: deep merge
            return { ...context, ...callback(context) };
        });
    }

    public option<
        const Type extends keyof OptionTypeResolvable,
        const Name extends string,
        const Required extends boolean,
    >(
        option: Option<Context, Type, Name, Required>,
    ): CommandBuilder<Context & AddOptionToContext<Type, Name, Required>> {
        switch (option.type as Type) {
            case 'boolean': {
                return this.derive(({ interaction }) => {
                    const value = interaction.options.getBoolean(option.name, option.required);
                    return { options: { [option.name]: value } } as AddOptionToContext<Type, Name, Required>;
                });
            }
            case 'string': {
                return this.derive(({ interaction }) => {
                    const value = interaction.options.getString(option.name, option.required);
                    return { options: { [option.name]: value } } as AddOptionToContext<Type, Name, Required>;
                });
            }
            default: {
                throw new Error('unknown type');
            }
        }
    }

    public execute(executeCallback: ExecuteCallback<Context>): CommandDefinition<Context> {
        return new CommandDefinition(executeCallback, this.prepareCallback);
    }

    public context: Context = {} as any;
}

class CommandDefinition<Context extends BaseContext> {
    constructor(private executeCallback: ExecuteCallback<Context>, private prepareCallback: PrepareCallback<Context>) {}

    public execute(interaction: ChatInputCommandInteraction): Promise<unknown> {
        return this.executeCallback(this.prepareCallback({ interaction }));
    }
}

type PrepareCallback<Context extends BaseContext> = (context: BaseContext) => Context;
type ExecuteCallback<Context extends BaseContext> = (
    context: Context & { interaction: ChatInputCommandInteraction },
) => Promise<unknown>;

const myCommand = CommandBuilder.start()
    .option({
        name: 'foo',
        type: 'string',
        required: true,
    })
    .option({
        name: 'bar',
        type: 'string',
        required: false,
        async autocomplete({ interaction, options }) {
            console.log(options.foo);
            await interaction.respond([]);
        },
    })
    .derive((context) => {
        return { ...context, hi: 'hiiii' };
    })
    .execute(async ({ interaction, options: { foo, bar }, hi }) => {
        await interaction.reply(`You selected ${foo} and ${bar} ${hi}`);
    });

interface OptionTypeResolvable {
    boolean: boolean;
    string: string;
}

interface OptionBase<Name extends string, Required extends boolean> {
    name: Name;
    description?: string;
    required: Required;
}

interface BooleanOption<Name extends string, Required extends boolean> extends OptionBase<Name, Required> {
    type: 'boolean';
}

interface StringOption<Name extends string, Required extends boolean> extends OptionBase<Name, Required> {
    type: 'string';
}

type Option<Context, Type extends keyof OptionTypeResolvable, Name extends string, Required extends boolean> = {
    type: Type;
    autocomplete?: AutocompleteCallback<Context>;
} & (BooleanOption<Name, Required> | StringOption<Name, Required>);

type AutocompleteCallback<Context> = (
    context: Omit<Context, 'interaction'> & { interaction: AutocompleteInteraction },
) => Promise<unknown>;
