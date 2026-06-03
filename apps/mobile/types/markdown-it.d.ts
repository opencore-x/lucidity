// markdown-it@10 ships no types and @types/markdown-it isn't installed. We only use the
// constructor and `parse()`, plus the handful of token fields the MarkdownView walker
// reads — so this minimal ambient declaration is enough (picked up via tsconfig **/*.ts).
declare module 'markdown-it' {
  export interface MarkdownItToken {
    type: string;
    tag: string;
    content: string;
    info: string;
    markup: string;
    nesting: number;
    level: number;
    children: MarkdownItToken[] | null;
  }

  export interface MarkdownItOptions {
    html?: boolean;
    linkify?: boolean;
    breaks?: boolean;
    typographer?: boolean;
  }

  export default class MarkdownIt {
    constructor(options?: MarkdownItOptions);
    parse(src: string, env: unknown): MarkdownItToken[];
  }
}
