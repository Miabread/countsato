type Command = {
    name: string;
    description?: string;
} & (
    | { handle: typeof foo }
    | { subcommands: { [subcommand: string]: typeof foo } }
    | { groups: { [group: string]: { [subcommand: string]: typeof foo } } }
);

interface OptionTypes {
    string: string;
    boolean: boolean;
}

type Options = {
    [name: string]: { type: 'string' } | { type: 'boolean' };
};

type Execute<O extends Options> = (options: {
    [K in keyof O]: OptionTypes[O[K]['type']];
}) => Promise<unknown>;

const foo = Symbol();

const handle = <const O extends Options>(options: O, execute: Execute<O>): typeof foo => {
    return foo;
};

const command = <const C extends Command>(command: C) => {
    return command;
};

const ping = command({
    name: 'ping',
    description: 'ping',

    handle: handle(
        {
            foo: { type: 'string' },
        },
        async (options) => {},
    ),
});

const subcommand = command({
    name: 'subcommand',
    subcommands: {
        meow: handle({ foo: { type: 'string' } }, async (options) => {}),
    },
});

const groups = command({
    name: 'groups',
    groups: {
        mrrp: {
            meow: handle({ foo: { type: 'string' } }, async (options) => {}),
        },
    },
});
