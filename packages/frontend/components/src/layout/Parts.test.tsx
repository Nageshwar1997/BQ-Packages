// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { BorderGradient } from './BorderGradient.js';
import { Skeleton } from './Skeleton.js';
import { Table, TableBody, TableHead, TableHeadCell, TableRow, TableRowCell } from './Table.js';

const first = (container: HTMLElement) =>
  required(container.firstElementChild, 'the first element');

describe('BorderGradient', () => {
  afterEach(unmountAll);

  it('is a border box with a card inside, which holds the content', () => {
    const view = mount(<BorderGradient>content</BorderGradient>);
    const border = first(view.container);
    const card = required(border.firstElementChild, 'the card');

    expect(border.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['bg-border-gradient', 'p-px']),
    );
    expect(card.textContent).toBe('content');
    expect(card.className.split(/\s+/)).toContain('rounded-[23px]');
  });

  it('gives containerClassName to the border and className to the card, after their own', () => {
    const view = mount(
      <BorderGradient containerClassName="max-w-md" className="p-0!">
        x
      </BorderGradient>,
    );
    const border = first(view.container);
    const card = required(border.firstElementChild, 'the card');

    expect(border.className.endsWith(' max-w-md')).toBe(true);
    expect(card.className.endsWith(' p-0!')).toBe(true);
    expect(card.className).not.toContain('max-w-md');
  });

  it('gives the other attributes to the card, not to the border', () => {
    const view = mount(
      <BorderGradient id="card" role="group" aria-label="Login" data-testid="c" />,
    );
    const border = first(view.container);
    const card = required(border.firstElementChild, 'the card');

    expect(card.id).toBe('card');
    expect(card.getAttribute('role')).toBe('group');
    expect(card.getAttribute('aria-label')).toBe('Login');
    expect(border.hasAttribute('id')).toBe(false);
  });

  it('does not give its own props to the page as attributes', () => {
    const view = mount(<BorderGradient containerClassName="a" />);

    expect(first(view.container).hasAttribute('containerclassname')).toBe(false);
  });
});

describe('Skeleton', () => {
  afterEach(unmountAll);

  it('is a pulsing block that fills its place, hidden from assistive technology', () => {
    const view = mount(<Skeleton />);
    const block = first(view.container);

    expect(block.getAttribute('aria-hidden')).toBe('true');
    expect(block.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['animate-pulse', 'size-full']),
    );
  });

  it('stops pulsing for a person who asked for less motion', () => {
    const view = mount(<Skeleton />);

    expect(first(view.container).className.split(/\s+/)).toContain('motion-reduce:animate-none');
  });

  it('takes the classes and the attributes it is given', () => {
    const view = mount(<Skeleton className="h-4 w-20" data-testid="s" />);
    const block = first(view.container);

    expect(block.className.endsWith(' h-4 w-20')).toBe(true);
    expect(block.getAttribute('data-testid')).toBe('s');
  });
});

describe('Table', () => {
  afterEach(unmountAll);

  const Example = () => (
    <Table aria-label="Orders" className="min-w-full">
      <TableHead>
        <TableRow>
          <TableHeadCell>Order</TableHeadCell>
          <TableHeadCell scope="row">Special</TableHeadCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow className="hover:bg-primary/5">
          <TableRowCell colSpan={2}>#1001</TableRowCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  it('is made of real table elements, in the right places', () => {
    const view = mount(<Example />);
    const table = first(view.container);

    expect(table.tagName).toBe('TABLE');
    expect(table.querySelector('thead > tr > th')?.textContent).toBe('Order');
    expect(table.querySelector('tbody > tr > td')?.textContent).toBe('#1001');
  });

  it('can be named, and takes its own classes after the ones of the apps', () => {
    const view = mount(<Example />);
    const table = first(view.container);

    expect(table.getAttribute('aria-label')).toBe('Orders');
    expect(table.className).toBe('w-full table-auto min-w-full');
  });

  it('has header cells that are the header of their column, unless told another scope', () => {
    const view = mount(<Example />);
    const [column, row] = [...view.container.querySelectorAll('th')];

    expect(column.getAttribute('scope')).toBe('col');
    expect(row.getAttribute('scope')).toBe('row');
  });

  it('gives the class of a header cell after its own', () => {
    const view = mount(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell className="mine">Name</TableHeadCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    const cell = required(view.container.querySelector('th'), 'the header cell');

    expect(cell.className).toMatch(/uppercase transition-colors duration-100 mine$/);
  });

  it('gives the attributes to the cell (colSpan) and the classes after its own', () => {
    const view = mount(<Example />);
    const cell = required(view.container.querySelector('td'), 'the cell');
    const row = required(view.container.querySelector('tbody tr'), 'the row');

    expect(cell.getAttribute('colspan')).toBe('2');
    expect(row.className).toBe('transition-colors duration-100 hover:bg-primary/5');
  });
});
