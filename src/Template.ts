/*!
 * Copyright 2019 yangjunbao <yangjunbao@shimo.im>. All rights reserved.
 * @since 2019-10-10 12:45:26
 *
 * most of the code comes from
 * {@link https://github.com/mde/ejs/blob/master/lib/ejs.js}
 */

import { AsyncReadableStream } from './AsyncReadableStream';

const _ENCODE_HTML_RULES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;',
};
const _MATCH_HTML = /[&<>'"]/g;

function encode_char(c: string) {
  return _ENCODE_HTML_RULES[c] || c;
}

function escapeXML(markup: any) {
  return markup == undefined
    ? ''
    : String(markup).replace(_MATCH_HTML, encode_char);
}

const OPEN = '<';
const CLOSE = '>';
const DELIMITER = '%';
const LOCALS_NAME = 'locals';
const REGEXP = /(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)/;

function stripSemi(str: string) {
  return str.replace(/;(\s*$)/, '$1');
}

export interface TemplateOptions {
  async: boolean;
  defer: boolean;
}

enum MODE {
  EVAL = 'eval',
  ESCAPED = 'escaped',
  RAW = 'raw',
  COMMENT = 'comment',
  LITERAL = 'literal',
}

export class Template<T extends object> {
  templateText: string;
  mode: MODE | null;
  truncate: boolean;
  currentLine: number;
  source: string;
  dependencies: any[];
  opts: TemplateOptions;

  constructor(text: string, options: Partial<TemplateOptions> = {}) {
    this.opts = {
      async: options.async || false,
      defer: options.defer || false,
    };
    this.templateText = text;
    this.mode = null;
    this.truncate = false;
    this.currentLine = 1;
    this.source = '';
    this.dependencies = [];
  }

  compile() {
    let fn: (...args: any[]) => AsyncReadableStream;
    let prepended = '';
    let appended = '';

    if (!this.source) {
      this.generateSource();
      prepended +=
        '  let __output = new AsyncReadableStream(), __append = __output.pushChunk.bind(__output);\n';
      if (this.opts.defer) {
        prepended += `  setTimeout(${this.opts.async ? 'async ' : ''}() => {\n`;
      }
      prepended += '  with (' + LOCALS_NAME + ' || {}) {\n';
      appended += '  }\n';
      appended += '  __output.end();\n';
      if (this.opts.defer) {
        appended += '  }, 0);\n';
      }
      appended += '  return __output;\n';
      this.source = prepended + this.source + appended;
    }

    let ctor: any;
    if (this.opts.async) {
      // Have to use generated function for this, since in envs without support,
      // it breaks in parsing
      try {
        ctor = new Function('return (async function(){}).constructor;')();
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error('This environment does not support async/await');
        } else {
          throw e;
        }
      }
    } else {
      ctor = Function;
    }
    try {
      fn = new ctor(
        LOCALS_NAME,
        'escapeFn',
        'AsyncReadableStream',
        this.source,
      ) as any;
    } catch (e) {
      // istanbul ignore else
      if (e instanceof SyntaxError) {
        e.message += ' while compiling ejs\n\n';
        e.message +=
          'If the above error is not helpful, you may want to try EJS-Lint:\n';
        e.message += 'https://github.com/RyanZim/EJS-Lint';
      }
      throw e;
    }

    // Return a callable function which will execute the function
    // created by the source-code, with the passed data as locals
    // Adds a local `include` function which allows full recursive include
    return (data: T) => {
      return fn(data || {}, escapeXML, AsyncReadableStream);
    };
  }

  generateSource() {
    // Slurp spaces and tabs before <%_ and after _%>
    this.templateText = this.templateText
      .replace(/[ \t]*<%_/gm, '<%_')
      .replace(/_%>[ \t]*/gm, '_%>');

    const matches = this.parseTemplateText();

    if (matches && matches.length) {
      matches.forEach((line, index) => {
        let closing: string;
        if (
          // If it is a tag
          line.indexOf(OPEN + DELIMITER) === 0 &&
          line.indexOf(OPEN + DELIMITER + DELIMITER) !== 0
        ) {
          // and is not escaped
          closing = matches[index + 2];
          if (
            !(
              closing == DELIMITER + CLOSE ||
              closing == '-' + DELIMITER + CLOSE ||
              closing == '_' + DELIMITER + CLOSE
            )
          ) {
            throw new Error(
              'Could not find matching close tag for "' + line + '".',
            );
          }
        }
        this.scanLine(line);
      });
    }
  }

  parseTemplateText() {
    let str = this.templateText;
    let result = REGEXP.exec(str);
    const arr: string[] = [];
    let firstPos: number;

    while (result) {
      firstPos = result.index;

      if (firstPos !== 0) {
        arr.push(str.substring(0, firstPos));
        str = str.slice(firstPos);
      }

      arr.push(result[0]);
      str = str.slice(result[0].length);
      result = REGEXP.exec(str);
    }

    if (str) {
      arr.push(str);
    }

    return arr;
  }

  _addOutput(line: string) {
    if (this.truncate) {
      // Only replace single leading linebreak in the line after
      // -%> tag -- this is the single, trailing linebreak
      // after the tag that the truncation mode replaces
      // Handle Win / Unix / old Mac linebreaks -- do the \r\n
      // combo first in the regex-or
      line = line.replace(/^(?:\r\n|\r|\n)/, '');
      this.truncate = false;
    }
    if (!line) {
      return line;
    }

    // Preserve literal slashes
    line = line.replace(/\\/g, '\\\\');

    // Convert linebreaks
    line = line.replace(/\n/g, '\\n');
    line = line.replace(/\r/g, '\\r');

    // Escape double-quotes
    // - this will be the delimiter during execution
    line = line.replace(/"/g, '\\"');
    this.source += '    ; __append("' + line + '")' + '\n';
    return void 0;
  }

  scanLine(line: string) {
    switch (line) {
      case OPEN + DELIMITER:
      case OPEN + DELIMITER + '_':
        this.mode = MODE.EVAL;
        break;
      case OPEN + DELIMITER + '=':
        this.mode = MODE.ESCAPED;
        break;
      case OPEN + DELIMITER + '-':
        this.mode = MODE.RAW;
        break;
      case OPEN + DELIMITER + '#':
        this.mode = MODE.COMMENT;
        break;
      case OPEN + DELIMITER + DELIMITER:
        this.mode = MODE.LITERAL;
        this.source +=
          '    ; __append("' +
          line.replace(OPEN + DELIMITER + DELIMITER, OPEN + DELIMITER) +
          '")' +
          '\n';
        break;
      case DELIMITER + DELIMITER + CLOSE:
        this.mode = MODE.LITERAL;
        this.source +=
          '    ; __append("' +
          line.replace(DELIMITER + DELIMITER + CLOSE, DELIMITER + CLOSE) +
          '")' +
          '\n';
        break;
      case DELIMITER + CLOSE:
      case '-' + DELIMITER + CLOSE:
      case '_' + DELIMITER + CLOSE:
        if (this.mode == MODE.LITERAL) {
          this._addOutput(line);
        }

        this.mode = null;
        this.truncate = line.indexOf('-') === 0 || line.indexOf('_') === 0;
        break;
      default:
        // In script mode, depends on type of tag
        if (this.mode) {
          // If '//' is found without a line break, add a line break.
          switch (this.mode) {
            case MODE.EVAL:
            case MODE.ESCAPED:
            case MODE.RAW:
              if (line.lastIndexOf('//') > line.lastIndexOf('\n')) {
                line += '\n';
              }
          }
          switch (this.mode) {
            // Just executing code
            case MODE.EVAL:
              this.source += '    ; ' + line + '\n';
              break;
            // Exec, esc, and output
            case MODE.ESCAPED:
              this.source +=
                '    ; __append(escapeFn(' + stripSemi(line) + '))' + '\n';
              break;
            // Exec and output
            case MODE.RAW:
              this.source += '    ; __append(' + stripSemi(line) + ')' + '\n';
              break;
            case MODE.COMMENT:
              // Do nothing
              break;
            // Literal <%% mode, append as raw output
            case MODE.LITERAL:
              this._addOutput(line);
              break;
          }
        }
        // In string mode, just add the output
        else {
          this._addOutput(line);
        }
    }
  }
}

export function compile<T extends object>(
  template: string,
  options?: TemplateOptions,
) {
  return new Template<T>(template, options).compile();
}

export function render<T extends object>(
  template: string,
  data: T,
  options?: TemplateOptions,
) {
  return new Template<T>(template, options).compile()(data);
}
