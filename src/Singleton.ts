export interface Singleton<T> {
  getInstance(): Promise<T>;
}
