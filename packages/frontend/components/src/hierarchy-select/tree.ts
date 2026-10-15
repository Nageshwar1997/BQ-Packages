import type { ReactNode } from 'react';

export type TTreeValue = string | number;

/** What the tree needs of an option; the option of the field has more. */
export interface ITreeNode<TNode extends ITreeNode<TNode>> {
  label: ReactNode;
  value: TTreeValue;
  disabled?: boolean;
  searchLabel?: string;
  children?: readonly TNode[];
}

/** A line of the tree as it is shown: a node with where it is. */
export interface ITreeRow<TNode> {
  node: TNode;
  /** 1 for the top of the tree. */
  level: number;
  /** Its place among the nodes that share its parent (from 1) and how many those are. */
  position: number;
  size: number;
  isBranch: boolean;
  isExpanded: boolean;
  parent: TTreeValue | undefined;
}

const searchTextOf = (node: { label: ReactNode; value: TTreeValue; searchLabel?: string }) =>
  node.searchLabel ?? (typeof node.label === 'string' ? node.label : String(node.value));

/**
 * The nodes that match `keyword`, and the branches that lead to them. A node that matches keeps all
 * that is under it (the person can browse what they found); a branch that does not match is kept
 * only with the matching nodes under it.
 */
export const filterTree = <TNode extends ITreeNode<TNode>>(
  nodes: readonly TNode[],
  keyword: string,
): readonly TNode[] => {
  const text = keyword.trim().toLowerCase();

  if (!text) return nodes;

  return nodes.flatMap((node) => {
    if (searchTextOf(node).toLowerCase().includes(text)) return [node];

    const children = node.children ? filterTree(node.children, keyword) : [];

    return children.length > 0 ? [{ ...node, children }] : [];
  });
};

/**
 * The lines to draw, from the top: a branch that is expanded (or all of them, with `forceExpanded`) is
 * followed by its own lines.
 */
export const buildRows = <TNode extends ITreeNode<TNode>>(
  nodes: readonly TNode[],
  expanded: readonly TTreeValue[],
  forceExpanded: boolean,
  level = 1,
  parent?: TTreeValue,
): ITreeRow<TNode>[] =>
  nodes.flatMap((node, index) => {
    const isBranch = !!node.children?.length;
    const isExpanded = isBranch && (forceExpanded || expanded.includes(node.value));
    const row: ITreeRow<TNode> = {
      node,
      level,
      position: index + 1,
      size: nodes.length,
      isBranch,
      isExpanded,
      parent,
    };

    return isExpanded
      ? [row, ...buildRows(node.children ?? [], expanded, forceExpanded, level + 1, node.value)]
      : [row];
  });

/** The node with this value, wherever it is in the tree. */
export const findNode = <TNode extends ITreeNode<TNode>>(
  nodes: readonly TNode[],
  value: TTreeValue,
): TNode | undefined => {
  for (const node of nodes) {
    if (node.value === value) return node;

    const found = node.children ? findNode(node.children, value) : undefined;

    if (found) return found;
  }

  return undefined;
};

/** The values of the branches above a node (so they can be opened to show it), or `[]` when it is not in the tree. */
export const ancestorsOf = <TNode extends ITreeNode<TNode>>(
  nodes: readonly TNode[],
  value: TTreeValue,
  path: readonly TTreeValue[] = [],
): readonly TTreeValue[] => {
  for (const node of nodes) {
    if (node.value === value) return path;

    const found = node.children ? ancestorsOf(node.children, value, [...path, node.value]) : [];

    if (found.length > 0) return found;
  }

  return [];
};
