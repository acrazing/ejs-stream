/*!
 * Copyright 2019 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2019-10-12 13:50:36
 */

import { render } from './Template';
import { createReadable, resolveReadable, sleep } from './utils';

describe('Template', () => {
  it('should render as expected', async () => {
    const readable = render(
      `
<!DOCTYPE html>
<html>
<% for(let i = 0; i < 3; i++) { %><%- 'control-flow-for-' + i %><% } %>
<% if(1) { // line comment %><%- 'after line comment' %><% } %>
<% if(1) { /* block comment */ %><%- 'after block comment' %><% } %>
<%= '<escaped html></escaped>' %>
<%- '<raw>html</raw>' %>
<%# this is comment block %>
raw <%% %%>
    <% if(1) %><%- 'with leading whitespace' %>
    <%_ if(1) %><%- 'without leading whitespace' %>
<%- 'trim new line' -%>
should without \\n
<%- 'with trailing whitespace' %>    
<%- 'without trailing whitespace' _%>    
<%- string %>
<%- promise %>
<%- readable %>
<%- buffer %>
<%- array %>
<%- end %>
<%= void 0 -%>
</html>
      `.trim(),
      {
        string: 'input-string',
        promise: sleep(1).then(() => 'input-promise'),
        readable: createReadable(2, 'input-readable-'),
        buffer: Buffer.from('input-buffer'),
        array: [
          'array-string',
          sleep(1).then(() => 'array-promise'),
          createReadable(2, 'array-readable-'),
          Buffer.from('array-buffer'),
        ],
        end: 'input-end',
      },
    );
    const chunks = await resolveReadable(readable);
    expect(chunks).toEqual([
      '<!DOCTYPE html>\n<html>\n',
      'control-flow-for-0',
      'control-flow-for-1',
      'control-flow-for-2',
      '\n',
      'after line comment',
      '\n',
      'after block comment',
      '\n',
      '&lt;escaped html&gt;&lt;/escaped&gt;',
      '\n',
      '<raw>html</raw>',
      '\n',
      '\nraw ',
      '<%',
      ' ',
      '%>',
      '\n    ',
      'with leading whitespace',
      '\n',
      'without leading whitespace',
      '\n',
      'trim new line',
      'should without \\n\n',
      'with trailing whitespace',
      '    \n',
      'without trailing whitespace',
      'input-string',
      '\n',
      'input-promise',
      '\n',
      'input-readable-2',
      'input-readable-1',
      '\n',
      'input-buffer',
      '\n',
      'array-string',
      'array-promise',
      'array-readable-2',
      'array-readable-1',
      'array-buffer',
      '\n',
      'input-end',
      '\n',
      '</html>',
    ]);
  });
});
