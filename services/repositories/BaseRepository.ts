import { IRepository } from '@/types/masterCore';

/**
 * Abstract Base Repository enforcing SOLID & OOP Abstraction principles.
 * Decouples UI components from lower-level Database or Supabase/Firebase API details.
 */
export abstract class BaseRepository<T extends { id?: string }> implements IRepository<T> {
  protected abstract entityName: string;

  abstract getAll(): Promise<T[]>;
  abstract getById(id: string): Promise<T | null>;
  abstract create(item: Omit<T, 'id'> | Partial<T>): Promise<T>;
  abstract update(id: string, item: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;

  async bulkDelete(ids: string[]): Promise<boolean> {
    try {
      for (const id of ids) {
        await this.delete(id);
      }
      return true;
    } catch (error) {
      console.error(`Error in bulkDelete for ${this.entityName}:`, error);
      return false;
    }
  }

  async bulkUpdate(ids: string[], updateData: Partial<T>): Promise<boolean> {
    try {
      for (const id of ids) {
        await this.update(id, updateData);
      }
      return true;
    } catch (error) {
      console.error(`Error in bulkUpdate for ${this.entityName}:`, error);
      return false;
    }
  }
}
