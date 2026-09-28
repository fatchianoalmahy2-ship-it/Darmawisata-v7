import { BaseRepository } from './BaseRepository';
import { RundownItem } from '@/types';
import { dbService } from '../dbService';

export class RundownRepositoryImpl extends BaseRepository<RundownItem> {
  protected entityName = 'RundownItem';

  async getAll(): Promise<RundownItem[]> {
    return await dbService.getAllRundowns();
  }

  async getById(id: string): Promise<RundownItem | null> {
    const all = await this.getAll();
    return all.find((r) => r.id === id) || null;
  }

  async create(item: Omit<RundownItem, 'id'> | Partial<RundownItem>): Promise<RundownItem> {
    const newItem: RundownItem = {
      id: item.id || `RD_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      day: item.day || 1,
      time: item.time || '',
      activity: item.activity || '',
      location: item.location || '',
      notes: item.notes || '',
    };

    await dbService.putRundown(newItem);
    return newItem;
  }

  async update(id: string, item: Partial<RundownItem>): Promise<RundownItem> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Rundown item with id ${id} not found.`);
    }

    const updated: RundownItem = {
      ...existing,
      ...item,
      id,
    };

    await dbService.putRundown(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await dbService.deleteRundown(id);
    return true;
  }
}

export const RundownRepository = new RundownRepositoryImpl();
