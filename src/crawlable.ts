export abstract class Crawlable<T> {
  abstract run(): Promise<T[]>;
}
