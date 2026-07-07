export interface IRequestCheckOptions {
  body?: boolean;
  file?: boolean;
  fileOrBody?: boolean;
  filesOrBody?: boolean;
  files?: boolean;
  params?: boolean;
  query?: boolean;
}

export interface IServiceAccessOptions {
  headerName?: string;
  secret: string;
}
