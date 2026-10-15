import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ancestorsOf, buildRows, filterTree, findNode, type ITreeNode } from './tree.js';

interface INode extends ITreeNode<INode> {
  label: ReactNode;
}

const TREE: INode[] = [
  {
    label: 'Skin',
    value: 'skin',
    children: [
      { label: 'Cleanser', value: 'cleanser' },
      {
        label: 'Moisturiser',
        value: 'moisturiser',
        children: [
          { label: 'Day cream', value: 'day' },
          { label: 'Night cream', value: 'night' },
        ],
      },
    ],
  },
  { label: 'Hair', value: 'hair', children: [{ label: 'Shampoo', value: 'shampoo' }] },
  { label: 'Gift card', value: 7 },
];

const valuesOf = (nodes: readonly INode[]): unknown[] =>
  nodes.flatMap((node) => [node.value, ...(node.children ? valuesOf(node.children) : [])]);

describe('filterTree', () => {
  it('gives the same nodes for an empty search, also one of spaces', () => {
    expect(filterTree(TREE, '')).toBe(TREE);
    expect(filterTree(TREE, '   ')).toBe(TREE);
  });

  it('keeps a node that matches with everything under it', () => {
    expect(valuesOf(filterTree(TREE, 'moist'))).toEqual(['skin', 'moisturiser', 'day', 'night']);
  });

  it('keeps the branches that lead to a match, with only the matches under them', () => {
    const result = filterTree(TREE, 'night');

    expect(valuesOf(result)).toEqual(['skin', 'moisturiser', 'night']);
    expect(result[0]?.children).toHaveLength(1);
  });

  it('keeps a branch that matches whole, and not by its children', () => {
    expect(valuesOf(filterTree(TREE, 'hair'))).toEqual(['hair', 'shampoo']);
  });

  it('does not mind capital letters, or spaces around the word', () => {
    expect(valuesOf(filterTree(TREE, '  NIGHT  '))).toEqual(['skin', 'moisturiser', 'night']);
  });

  it('matches a part of the word, not only its start', () => {
    expect(valuesOf(filterTree(TREE, 'ream'))).toEqual(['skin', 'moisturiser', 'day', 'night']);
  });

  it('gives nothing when nothing matches', () => {
    expect(filterTree(TREE, 'zzz')).toEqual([]);
  });

  it('looks at the searchLabel, before the label', () => {
    const nodes: INode[] = [{ label: 'Visible', value: 'a', searchLabel: 'Hidden word' }];

    expect(filterTree(nodes, 'hidden')).toHaveLength(1);
    expect(filterTree(nodes, 'visible')).toEqual([]);
  });

  it('looks at the value for a label that is not text and has no searchLabel', () => {
    const nodes: INode[] = [{ label: ['a', 'b'], value: 'the-value' }];

    expect(filterTree(nodes, 'the-val')).toHaveLength(1);
  });

  it('looks at a number value as text', () => {
    expect(valuesOf(filterTree([{ label: ['x'], value: 7 }], '7'))).toEqual([7]);
  });

  it('does not change the nodes it was given', () => {
    const before = JSON.stringify(TREE);

    filterTree(TREE, 'night');

    expect(JSON.stringify(TREE)).toBe(before);
  });

  it('keeps the other properties of a branch it copies', () => {
    const nodes: INode[] = [
      {
        label: 'Parent',
        value: 'p',
        disabled: true,
        children: [{ label: 'Match', value: 'm' }],
      },
    ];

    expect(filterTree(nodes, 'match')[0]).toMatchObject({ value: 'p', disabled: true });
  });
});

describe('buildRows', () => {
  it('has a line for each node at the top, in order, when nothing is open', () => {
    const rows = buildRows(TREE, [], false);

    expect(rows.map((row) => row.node.value)).toEqual(['skin', 'hair', 7]);
    expect(rows.map((row) => row.isBranch)).toEqual([true, true, false]);
    expect(rows.map((row) => row.isExpanded)).toEqual([false, false, false]);
  });

  it('puts the lines of an open branch right after it', () => {
    const rows = buildRows(TREE, ['skin'], false);

    expect(rows.map((row) => row.node.value)).toEqual([
      'skin',
      'cleanser',
      'moisturiser',
      'hair',
      7,
    ]);
    expect(rows[0]?.isExpanded).toBe(true);
  });

  it('goes as deep as the open branches', () => {
    const rows = buildRows(TREE, ['skin', 'moisturiser'], false);

    expect(rows.map((row) => row.node.value)).toEqual([
      'skin',
      'cleanser',
      'moisturiser',
      'day',
      'night',
      'hair',
      7,
    ]);
  });

  it('does not show what is under a branch that is open when its parent is closed', () => {
    const rows = buildRows(TREE, ['moisturiser'], false);

    expect(rows.map((row) => row.node.value)).toEqual(['skin', 'hair', 7]);
  });

  it('tells the level, the place among the nodes of the same parent, how many they are, and the parent', () => {
    const rows = buildRows(TREE, ['skin', 'moisturiser'], false);
    const night = rows.find((row) => row.node.value === 'night');
    const cleanser = rows.find((row) => row.node.value === 'cleanser');
    const top = rows.find((row) => row.node.value === 7);

    expect(night).toMatchObject({ level: 3, position: 2, size: 2, parent: 'moisturiser' });
    expect(cleanser).toMatchObject({ level: 2, position: 1, size: 2, parent: 'skin' });
    expect(top).toMatchObject({ level: 1, position: 3, size: 3, parent: undefined });
  });

  it('opens every branch when it is told to', () => {
    const rows = buildRows(TREE, [], true);

    expect(rows.map((row) => row.node.value)).toEqual([
      'skin',
      'cleanser',
      'moisturiser',
      'day',
      'night',
      'hair',
      'shampoo',
      7,
    ]);
    expect(rows.filter((row) => row.isBranch).every((row) => row.isExpanded)).toBe(true);
  });

  it('does not call a node without children expanded, also when it is in the list', () => {
    const rows = buildRows(TREE, [7, 'cleanser'], false);

    expect(rows.every((row) => !row.isExpanded || row.isBranch)).toBe(true);
  });

  it('does not call a node with an empty list of children a branch', () => {
    const rows = buildRows([{ label: 'Empty', value: 'e', children: [] }], ['e'], true);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.isBranch).toBe(false);
    expect(rows[0]?.isExpanded).toBe(false);
  });

  it('is empty for no nodes', () => {
    expect(buildRows([], [], false)).toEqual([]);
  });
});

describe('findNode', () => {
  it('finds a node at any depth, by its value', () => {
    expect(findNode(TREE, 'skin')?.label).toBe('Skin');
    expect(findNode(TREE, 'night')?.label).toBe('Night cream');
    expect(findNode(TREE, 7)?.label).toBe('Gift card');
  });

  it('finds nothing for a value that is not there, and tells a number from a text', () => {
    expect(findNode(TREE, 'nothing')).toBeUndefined();
    expect(findNode(TREE, '7')).toBeUndefined();
  });

  it('finds nothing in an empty tree', () => {
    expect(findNode<INode>([], 'a')).toBeUndefined();
  });
});

describe('ancestorsOf', () => {
  it('is the branches above a node, from the top', () => {
    expect(ancestorsOf(TREE, 'night')).toEqual(['skin', 'moisturiser']);
    expect(ancestorsOf(TREE, 'cleanser')).toEqual(['skin']);
    expect(ancestorsOf(TREE, 'shampoo')).toEqual(['hair']);
  });

  it('is empty for a node at the top, and for one that is not there', () => {
    expect(ancestorsOf(TREE, 'skin')).toEqual([]);
    expect(ancestorsOf(TREE, 7)).toEqual([]);
    expect(ancestorsOf(TREE, 'nothing')).toEqual([]);
  });

  it('is the branches above a branch, not the branch itself', () => {
    expect(ancestorsOf(TREE, 'moisturiser')).toEqual(['skin']);
  });
});
