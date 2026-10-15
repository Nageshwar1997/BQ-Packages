import { Icon } from '@iconify/react';
import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  type IFieldBase,
  Input,
  InputError,
  InputIcon,
  InputLabel,
  type ISelectOption,
  type ISelectProps,
  type TInputIcons,
} from '../inputs/index.js';
import { ApiStatus } from '../layout/index.js';
import { getDropdownStyle, type TDropdownPlacement } from '../lib/dropdown-position.js';
import { scrollRowIntoView } from '../lib/scrollRowIntoView.js';
import { findEnabledIndex } from '../lib/typeahead.js';
import { useAnchoredBox } from '../lib/useAnchoredBox.js';
import { useDismiss } from '../lib/useDismiss.js';
import { registerHierarchySelectIcons } from './hierarchy-select-icons.js';
import {
  buildRows,
  filterTree,
  findNode,
  type ITreeRow,
  type TTreeValue,
  ancestorsOf,
} from './tree.js';

export interface IHierarchySelectOption extends ISelectOption {
  /**
   * The options under this one. An option that has some is a branch: it opens and closes, and it is
   * not chosen itself; only the options without children are.
   */
  children?: readonly IHierarchySelectOption[];
}

/** The words the field says to assistive technology and on the screen. English by default. */
export interface IHierarchySelectLabels {
  /** The name of the list when the field has no `label`. */
  tree: string;
  /** The name of the field where the person searches. */
  search: string;
  /** What the search field says while it is empty. */
  searchPlaceholder: string;
  /** The button that empties the search. */
  clearSearch: string;
  noResultsTitle: string;
  noResultsDescription: string;
  /** Said when a search changes how many options there are. */
  results: (count: number) => string;
}

export interface IHierarchySelect extends IFieldBase {
  selectProps: ISelectProps;
  options: readonly IHierarchySelectOption[];
  /** An icon at each end of the field. One with an `onClick` is a button and needs a `label`. */
  icons?: TInputIcons;
  /** Classes for the box that opens (the search and the options). */
  optionsClassName?: string;
  /** Which side of the field it opens on, unless there is no room there. @default 'bottom' */
  position?: TDropdownPlacement;
  /**
   * Attributes of the search field. With a `value` that is text the search is the app's: it shows
   * that text and says in `onChange` what the person typed (to search on a server, for example).
   */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  labels?: Partial<IHierarchySelectLabels>;
}

const LABELS: IHierarchySelectLabels = {
  tree: 'Options',
  search: 'Search options',
  searchPlaceholder: 'Search here...',
  clearSearch: 'Clear search',
  noResultsTitle: 'No matching options found',
  noResultsDescription: 'Try searching with a different keyword or clear the search.',
  results: (count) => `${String(count)} ${count === 1 ? 'option' : 'options'} found`,
};

// The tallest the box gets: the search (~60) and the list (`max-h-60`) with their frames.
const POPUP_MAX_HEIGHT = 330;

type TRow = ITreeRow<IHierarchySelectOption>;

/**
 * A field that opens a tree of options (categories with sub-categories) with a search field above
 * it. Only an option without children can be chosen; the ones with children open and close.
 *
 * - The field is a button that opens a box with a search field and the tree. The focus goes to the
 *   search field and stays there: the arrow keys move through the tree (assistive technology is told
 *   which option is the active one), Right and Left open and close a branch or go to its first
 *   option and to its parent, Enter chooses (or opens/closes a branch), Escape closes it and gives
 *   the focus back to the field, and Tab closes it too.
 * - A search shows the options that match and the branches that lead to them, all open. An option
 *   that matches keeps what is under it.
 * - The box is drawn in `document.body`, so a parent that scrolls or hides what overflows does not
 *   cut it; it opens on the other side when there is no room, and follows the field while the page
 *   scrolls.
 */
export const HierarchySelect = ({
  label = '',
  className = '',
  error = '',
  containerClassName = '',
  optionsClassName = '',
  icons,
  selectProps,
  options,
  position = 'bottom',
  inputProps,
  labels,
}: IHierarchySelect) => {
  registerHierarchySelectIcons();

  const text: IHierarchySelectLabels = {
    tree: labels?.tree ?? LABELS.tree,
    search: labels?.search ?? LABELS.search,
    searchPlaceholder: labels?.searchPlaceholder ?? LABELS.searchPlaceholder,
    clearSearch: labels?.clearSearch ?? LABELS.clearSearch,
    noResultsTitle: labels?.noResultsTitle ?? LABELS.noResultsTitle,
    noResultsDescription: labels?.noResultsDescription ?? LABELS.noResultsDescription,
    results: labels?.results ?? LABELS.results,
  };
  const baseId = useId();
  const triggerId = selectProps.id ?? `${baseId}-field`;
  const popupId = `${baseId}-popup`;
  const treeId = `${baseId}-tree`;
  const errorId = `${baseId}-error`;
  const rowId = (index: number) => `${baseId}-row-${String(index)}`;

  const [isOpenState, setIsOpen] = useState(false);
  const [ownSearch, setOwnSearch] = useState('');
  const [expanded, setExpanded] = useState<readonly TTreeValue[]>([]);
  const [activeValue, setActiveValue] = useState<TTreeValue | undefined>(undefined);

  const fieldBoxRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const activeRowRef = useRef<HTMLLIElement | null>(null);

  const isSearchControlled = typeof inputProps?.value === 'string';
  const search = typeof inputProps?.value === 'string' ? inputProps.value : ownSearch;
  const isSearching = search.trim() !== '';
  const canOpen = options.length > 0 && !selectProps.disabled;
  // A field that is disabled (or left without options) while it is open closes, and stays closed
  // when it is enabled again.
  if (isOpenState && !canOpen) setIsOpen(false);

  const isOpen = isOpenState && canOpen;

  const selected = findNode(options, selectProps.value);
  const hasValue = selected !== undefined && selected.value !== '';

  const shown = useMemo(() => filterTree(options, search), [options, search]);
  const rows = useMemo(
    () => buildRows(shown, expanded, isSearching),
    [shown, expanded, isSearching],
  );
  const navigable = rows.map((row) => ({ disabled: row.node.disabled }));
  const foundIndex = rows.findIndex((row) => row.node.value === activeValue);
  // while searching the first option that can be chosen is the active one, so Enter takes it
  const firstChoosable = rows.findIndex((row) => !row.isBranch && !row.node.disabled);
  const activeIndex = foundIndex === -1 && isSearching ? firstChoosable : foundIndex;
  const activeRow = activeIndex === -1 ? undefined : rows.at(activeIndex);

  const popup = useAnchoredBox({
    isOpen,
    anchorRef: fieldBoxRef,
    position,
    needed: POPUP_MAX_HEIGHT,
  });

  const close = (returnFocus: boolean) => {
    setIsOpen(false);

    if (!isSearchControlled) setOwnSearch('');

    if (returnFocus) triggerRef.current?.focus();
  };

  const containerRef = useDismiss<HTMLDivElement>(
    (reason) => {
      close(reason === 'escape');
    },
    { enabled: isOpen, ignore: [popupRef] },
  );

  const open = () => {
    if (!canOpen) return;

    // the way to the option that is chosen is open, and the option is the active one
    setExpanded(selected ? ancestorsOf(options, selected.value) : []);
    setActiveValue(selected && !selected.disabled ? selected.value : undefined);
    setIsOpen(true);
  };

  const toggle = (value: TTreeValue) => {
    setExpanded((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  // A press, or Enter: a branch opens or closes, an option is chosen.
  const activate = (row: TRow) => {
    if (row.node.disabled) return;

    setActiveValue(row.node.value);

    if (row.isBranch) {
      // while searching every branch is open, and stays so
      if (!isSearching) toggle(row.node.value);

      return;
    }

    selectProps.onChange(row.node.value);
    close(true);
  };

  // The active option stays in view while the arrow keys move it.
  useEffect(() => {
    const list = listRef.current;
    const row = activeRowRef.current;

    if (isOpen && list && row) scrollRowIntoView(list, row);
  }, [isOpen, activeIndex, popup]);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    inputProps?.onChange?.(event);

    if (!isSearchControlled) setOwnSearch(event.target.value);
  };

  // The search is emptied as if the person had deleted the text: the field's own `change` event, so
  // an app that listens to it hears it.
  const clearSearch = () => {
    const input = searchRef.current;

    if (!input) return;

    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    inputProps?.onKeyDown?.(event);

    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();

        const next =
          activeIndex === -1 && event.key === 'ArrowUp'
            ? findEnabledIndex(navigable, rows.length, -1)
            : findEnabledIndex(navigable, activeIndex, event.key === 'ArrowDown' ? 1 : -1);
        const target = next === -1 ? undefined : rows.at(next);

        if (target) setActiveValue(target.node.value);

        return;
      }

      // Right and Left move the cursor in the text while there is a search: there is nothing to open
      // or close then, because every branch is open
      case 'ArrowRight': {
        if (isSearching || !activeRow?.isBranch) return;

        event.preventDefault();

        const firstChild = rows.at(activeIndex + 1);

        if (!activeRow.isExpanded) toggle(activeRow.node.value);
        else if (firstChild && !firstChild.node.disabled) setActiveValue(firstChild.node.value);

        return;
      }

      case 'ArrowLeft': {
        if (isSearching || !activeRow) return;

        if (activeRow.isExpanded) {
          event.preventDefault();
          toggle(activeRow.node.value);
        } else if (activeRow.parent !== undefined) {
          event.preventDefault();
          setActiveValue(activeRow.parent);
        }

        return;
      }

      case 'Enter':
        event.preventDefault();

        if (activeRow) activate(activeRow);

        return;

      case 'Tab':
        // the focus goes back to the field and the Tab goes on from there, not from the end of the page
        close(true);

        return;
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isOpen || event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}
    >
      <div className="relative" ref={fieldBoxRef}>
        <InputLabel htmlFor={triggerId} className="z-2">
          {label}
        </InputLabel>
        <div
          data-invalid={error ? '' : undefined}
          className={`border-primary/10 bg-smoke-eerie focus-within:border-blue-crayola-c data-invalid:border-red-c flex items-center gap-3 overflow-hidden rounded-lg border px-3 ${className}`}
        >
          <InputIcon icon={icons?.left} />
          <button
            id={triggerId}
            ref={triggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={isOpen ? popupId : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={selectProps.disabled}
            onClick={() => {
              if (isOpen) close(false);
              else open();
            }}
            onKeyDown={handleTriggerKeyDown}
            className={`text-primary flex min-w-0 flex-1 items-center justify-between gap-0.5 truncate border-none bg-transparent text-left text-[13px] outline-hidden ${
              selectProps.disabled ? 'cursor-no-drop' : 'cursor-pointer'
            }`}
          >
            <span
              className={`flex-1 truncate py-2 first-letter:capitalize xl:py-3 ${hasValue ? '' : 'text-primary/30'}`}
            >
              {selected?.label ?? selectProps.placeholder}
            </span>
            <Icon
              icon="solar:alt-arrow-down-linear"
              className={`size-4 transition-transform motion-reduce:transition-none md:size-5 ${
                isOpen ? 'rotate-180' : ''
              } ${hasValue ? 'text-primary' : 'text-primary/30'}`}
            />
          </button>
          <InputIcon icon={icons?.right} />
        </div>
      </div>
      <InputError id={errorId} error={error} />
      {isOpen &&
        popup &&
        createPortal(
          <div
            ref={popupRef}
            id={popupId}
            role="dialog"
            aria-label={label || text.tree}
            className={`border-primary/10 bg-smoke-eerie fixed z-3 overflow-hidden rounded-lg border shadow-md ${optionsClassName}`}
            style={getDropdownStyle(popup.rect, popup.placement, window.innerHeight)}
          >
            <Input
              needRef
              ref={searchRef}
              inputProps={{
                ...inputProps,
                value: search,
                onChange: handleSearch,
                onKeyDown: handleSearchKeyDown,
                placeholder: inputProps?.placeholder ?? text.searchPlaceholder,
                role: 'combobox',
                'aria-label': inputProps?.['aria-label'] ?? text.search,
                'aria-expanded': true,
                'aria-controls': rows.length > 0 ? treeId : undefined,
                'aria-activedescendant': activeIndex === -1 ? undefined : rowId(activeIndex),
                'aria-autocomplete': 'list',
                autoComplete: 'off',
                className: `py-2! ${inputProps?.className ?? ''}`,
              }}
              icons={{
                right: search
                  ? {
                      icon: 'lucide:x',
                      label: text.clearSearch,
                      className: 'size-4 text-primary',
                      onClick: clearSearch,
                    }
                  : { icon: 'solar:magnifer-linear', className: 'size-4 text-primary opacity-30' },
              }}
              containerClassName="p-2 border-b border-b-primary/20"
              className="bg-silver-jet/8!"
            />

            <div role="status" className="sr-only">
              {isSearching && rows.length > 0 ? text.results(rows.length) : ''}
            </div>

            {rows.length > 0 ? (
              <ul
                ref={listRef}
                id={treeId}
                role="tree"
                aria-label={label || text.tree}
                // a press on a row must not take the focus from the search field
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                className="relative flex max-h-60 flex-col gap-0.5 overflow-auto p-1"
              >
                {rows.map((row, index) => {
                  const isSelected = !row.isBranch && row.node.value === selectProps.value;
                  const isActive = index === activeIndex;
                  const isDisabled = !!row.node.disabled;

                  return (
                    <li
                      key={String(row.node.value)}
                      id={rowId(index)}
                      ref={isActive ? activeRowRef : null}
                      role="treeitem"
                      aria-level={row.level}
                      aria-posinset={row.position}
                      aria-setsize={row.size}
                      aria-expanded={row.isBranch ? row.isExpanded : undefined}
                      aria-selected={isSelected}
                      aria-disabled={isDisabled ? true : undefined}
                      style={{ paddingLeft: `${String(8 + (row.level - 1) * 12)}px` }}
                      className={`text-tertiary flex items-center gap-2 rounded-sm py-1.5 pr-2 text-[13px] ${
                        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      } ${isActive ? 'bg-primary/5' : ''} ${isSelected ? 'bg-primary/8' : ''}`}
                      onMouseMove={() => {
                        if (!isDisabled && !isActive) setActiveValue(row.node.value);
                      }}
                      onClick={() => {
                        activate(row);
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center"
                      >
                        {row.isBranch && (
                          <Icon
                            icon={
                              row.isExpanded
                                ? 'solar:alt-arrow-down-linear'
                                : 'solar:alt-arrow-right-linear'
                            }
                            className="size-4"
                          />
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center"
                      >
                        <Icon
                          icon={
                            row.isBranch
                              ? row.isExpanded
                                ? 'solar:folder-open-linear'
                                : 'solar:folder-linear'
                              : 'solar:file-linear'
                          }
                          className="size-4"
                        />
                      </span>
                      <span className="flex-1 text-left text-[13px] first-letter:capitalize">
                        {row.node.label}
                      </span>
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="flex size-5 shrink-0 items-center justify-center"
                        >
                          <Icon
                            icon="solar:unread-linear"
                            className="text-primary size-4 md:size-5"
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ApiStatus
                status="empty"
                title={text.noResultsTitle}
                description={text.noResultsDescription}
                className="min-h-30!"
              />
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
