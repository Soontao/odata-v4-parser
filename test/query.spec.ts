import { Parser } from '../src/parser';
import { findOne, findAll } from '../src/utils';
import { TokenType } from '../src/lexer';
import { get } from '@newdash/newdash';

describe('Query Test Suite', () => {

  const parser = new Parser();

  const expands = [
    ['$expand=A', 'A'],
    ['$expand=A/V', 'A/V'],
    ['$expand=A/B/C', 'A/B/C'],
    ['$expand=A,B/C', 'A'],
    ['$expand=*', '*']
  ];

  expands.forEach(([original, parsed]) => {

    it(`should parse ${original}`, () => {

      expect(parser.query(original).value.options[0].value.items[0].raw).toEqual(parsed);

    });

  });

  it('should parse $top', () => {
    expect(parser.query('$top=1').value.options[0].value.raw).toEqual('1');
  });

  it('should parse $top and $skip', () => {
    expect(parser.query('$top=1&$skip=120').value.options[0].value.raw).toEqual('1');
  });

  it('should parse $select', () => {
    expect(parser.query('$select=A').value.options[0].value.items[0].value.raw).toEqual('A');
    expect(parser.query('$select=*').value.options[0].value.items[0].value.value).toEqual('*');
    expect(
      findAll(parser.query('$select=A,B,C'), TokenType.SelectPath)
        .map((node) => get(node, 'value.value.name'))
    ).toStrictEqual(['A', 'B', 'C']);

    parser.query('$select=A/B');
  });

  it('should parse $search', () => {

    parser.query('$search=theo');
    parser.query('$search="theo%20sun"');

  });

  it('should parse $orderby', () => {
    parser.query('$orderby=A desc');
    parser.query('$orderby=A desc,B asc');
  });

  it('should parse $format', () => {
    parser.query('$format=xml');
    parser.query('$format=json');
    parser.query('$format=JSON');
    parser.query('$format=atom');
  });


  it('should parse $count', () => {
    const ast = parser.query('$count=true');
    const node = findOne(ast, TokenType.InlineCount);
    expect(node).not.toBeUndefined();
  });

});