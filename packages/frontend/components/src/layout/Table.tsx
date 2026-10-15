import type { ComponentProps } from 'react';

/*
 * The parts of a table, with the look of the apps. Every part is its own element (`<table>`,
 * `<thead>`, ...) and takes its attributes. Name the table for assistive technology: give `Table`
 * an `aria-label` (or an `aria-labelledby` that points at the heading above it).
 */

export const Table = ({ className = '', ...props }: ComponentProps<'table'>) => (
  <table {...props} className={`w-full table-auto ${className}`} />
);

export const TableHead = ({ className = '', ...props }: ComponentProps<'thead'>) => (
  <thead {...props} className={`border-y-primary/10 bg-primary/2 border-y ${className}`} />
);

export const TableBody = (props: ComponentProps<'tbody'>) => <tbody {...props} />;

export const TableRow = ({ className = '', ...props }: ComponentProps<'tr'>) => (
  <tr {...props} className={`transition-colors duration-100 ${className}`} />
);

/** A header cell. It is the header of its column unless told otherwise (`scope="row"`). */
export const TableHeadCell = ({
  className = '',
  scope = 'col',
  ...props
}: ComponentProps<'th'>) => (
  <th
    {...props}
    scope={scope}
    className={`text-primary/55 w-auto px-4 py-3 text-center text-xs font-semibold whitespace-nowrap uppercase transition-colors duration-100 ${className}`}
  />
);

export const TableRowCell = ({ className = '', ...props }: ComponentProps<'td'>) => (
  <td
    {...props}
    className={`w-auto px-4 py-3 text-center align-middle text-sm whitespace-nowrap ${className}`}
  />
);
