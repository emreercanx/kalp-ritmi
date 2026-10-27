export class TFile {
  constructor(
    public path: string,
    public name: string,
  ) {}
}

export class TFolder {
  children: unknown[] = [];
  constructor(public path: string) {}
}

export class App {}

export function normalizePath(path: string): string {
  return path.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}
