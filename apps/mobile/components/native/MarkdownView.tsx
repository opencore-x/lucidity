import * as React from 'react';
import MarkdownIt, { type MarkdownItToken } from 'markdown-it';
import { VStack, HStack, Text, Divider } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  background,
  cornerRadius,
  padding,
  frame,
} from '@expo/ui/swift-ui/modifiers';

/**
 * Renders markdown as native `@expo/ui` SwiftUI views, so it composes inside the task
 * sheet's `Host` tree (no webview, no RN renderer). Block structure is parsed in JS with
 * `markdown-it`; every inline span is delegated to SwiftUI's native `Text markdownEnabled`
 * (bold/italic/inline-code/links/strike). Covered blocks: headings, paragraphs, fenced /
 * indented code (monospaced card), bullet/ordered lists, blockquotes, and rules.
 *
 * Color syntax highlighting inside code blocks is a planned fast-follow — for now code
 * renders single-color and monospaced.
 */

const md = new MarkdownIt({ linkify: true, breaks: false });

type Theme = {
  text: string;
  muted: string;
  codeBg: string;
};

function themeFor(dark: boolean): Theme {
  return {
    text: dark ? '#E5E5E7' : '#1C1C1E',
    muted: '#8E8E93',
    // Code / quote cards sit on the inset-grouped section card (≈#1C1C1E dark, white light),
    // so the fill needs enough contrast to read as a raised card: a clearly-lighter gray in
    // dark mode, a slightly-deeper gray in light mode.
    codeBg: dark ? '#3A3A3C' : '#E5E5EA',
  };
}

const HEADING_SIZE: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 15, 6: 14 };

// The matching close index for a container `*_open` token: walk forward tracking nesting
// depth (handles nested same-type containers like a list inside a list).
function findClose(tokens: MarkdownItToken[], openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i++) {
    if (tokens[i].nesting === 1) depth++;
    else if (tokens[i].nesting === -1) depth--;
    if (depth === 0) return i;
  }
  return tokens.length - 1;
}

const fullWidth = frame({ maxWidth: Infinity, alignment: 'leading' });

function InlineText({
  content,
  theme,
  size,
  weight,
}: {
  content: string;
  theme: Theme;
  size: number;
  weight?: 'regular' | 'semibold';
}) {
  return (
    <Text markdownEnabled modifiers={[foregroundStyle(theme.text), font({ size, weight }), fullWidth]}>
      {content}
    </Text>
  );
}

function CodeBlock({ code, theme }: { code: string; theme: Theme }) {
  return (
    <VStack
      alignment="leading"
      modifiers={[fullWidth, padding({ horizontal: 12, vertical: 10 }), background(theme.codeBg), cornerRadius(8)]}>
      <Text modifiers={[font({ design: 'monospaced', size: 13 }), foregroundStyle(theme.text), fullWidth]}>
        {code}
      </Text>
    </VStack>
  );
}

function ListBlock({
  ordered,
  tokens,
  theme,
  keyBase,
}: {
  ordered: boolean;
  tokens: MarkdownItToken[];
  theme: Theme;
  keyBase: string;
}) {
  const items: React.ReactNode[] = [];
  let i = 0;
  let n = 1;
  while (i < tokens.length) {
    if (tokens[i].type === 'list_item_open') {
      const close = findClose(tokens, i);
      const inner = tokens.slice(i + 1, close);
      const marker = ordered ? `${n}.` : '•';
      items.push(
        <HStack key={`${keyBase}-li-${i}`} spacing={8} alignment="top">
          <Text modifiers={[foregroundStyle(theme.muted), font({ size: 16 })]}>{marker}</Text>
          <VStack spacing={4} alignment="leading" modifiers={[fullWidth]}>
            {renderBlocks(inner, theme, `${keyBase}-li-${i}`)}
          </VStack>
        </HStack>
      );
      n++;
      i = close + 1;
    } else {
      i++;
    }
  }
  return (
    <VStack spacing={6} alignment="leading" modifiers={[fullWidth]}>
      {items}
    </VStack>
  );
}

function Blockquote({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[fullWidth, padding({ horizontal: 12, vertical: 8 }), background(theme.codeBg), cornerRadius(6)]}>
      {children}
    </VStack>
  );
}

function renderBlocks(tokens: MarkdownItToken[], theme: Theme, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    const key = `${keyBase}-${i}`;
    switch (tok.type) {
      case 'heading_open': {
        const level = Number(tok.tag.slice(1)) || 1;
        const inline = tokens[i + 1];
        out.push(
          <InlineText
            key={key}
            content={inline?.content ?? ''}
            theme={theme}
            size={HEADING_SIZE[level] ?? 16}
            weight="semibold"
          />
        );
        i = findClose(tokens, i) + 1;
        break;
      }
      case 'paragraph_open': {
        const inline = tokens[i + 1];
        out.push(<InlineText key={key} content={inline?.content ?? ''} theme={theme} size={16} />);
        i = findClose(tokens, i) + 1;
        break;
      }
      case 'fence':
      case 'code_block': {
        out.push(<CodeBlock key={key} code={tok.content.replace(/\n+$/, '')} theme={theme} />);
        i++;
        break;
      }
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const close = findClose(tokens, i);
        out.push(
          <ListBlock
            key={key}
            ordered={tok.type === 'ordered_list_open'}
            tokens={tokens.slice(i + 1, close)}
            theme={theme}
            keyBase={key}
          />
        );
        i = close + 1;
        break;
      }
      case 'blockquote_open': {
        const close = findClose(tokens, i);
        out.push(
          <Blockquote key={key} theme={theme}>
            {renderBlocks(tokens.slice(i + 1, close), theme, key)}
          </Blockquote>
        );
        i = close + 1;
        break;
      }
      case 'hr': {
        out.push(<Divider key={key} />);
        i++;
        break;
      }
      default:
        i++;
    }
  }
  return out;
}

export function MarkdownView({ content, dark }: { content: string; dark: boolean }) {
  const theme = React.useMemo(() => themeFor(dark), [dark]);
  const blocks = React.useMemo(() => renderBlocks(md.parse(content, {}), theme, 'md'), [content, theme]);
  return (
    <VStack spacing={10} alignment="leading" modifiers={[fullWidth]}>
      {blocks}
    </VStack>
  );
}
