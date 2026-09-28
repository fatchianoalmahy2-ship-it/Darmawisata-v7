import { supabase } from '@/lib/supabaseClient';
import { EntitySchema } from '@/config/schemas/studentSchema';

/**
 * Generic API Service for handling RESTful/Supabase operations
 * based on Metadata-Driven Schema.
 */
export class GenericApiService<T extends { id?: string }> {
  private schema: EntitySchema;
  
  constructor(schema: EntitySchema) {
    this.schema = schema;
  }

  async getAll(): Promise<T[]> {
    if (!this.schema.endpoint) return [];
    
    // In this app context, data might be fetched by dbService/supabaseService,
    // but here we define the generic approach for REST/Supabase
    const { data, error } = await supabase.from(this.schema.endpoint).select('*');
    if (error) {
      console.error(`Error fetching ${this.schema.entityName}:`, error);
      throw error;
    }
    return (data || []) as T[];
  }

  async getById(id: string): Promise<T | null> {
    const { data, error } = await supabase.from(this.schema.endpoint).select('*').eq('id', id).single();
    if (error) {
      console.error(`Error fetching ${this.schema.entityName} by id:`, error);
      throw error;
    }
    return (data as T) || null;
  }

  async create(item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(this.schema.endpoint).insert([item as any]).select().single();
    if (error) {
      console.error(`Error creating ${this.schema.entityName}:`, error);
      throw error;
    }
    return data as T;
  }

  async update(id: string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(this.schema.endpoint).update(item as any).eq('id', id).select().single();
    if (error) {
      console.error(`Error updating ${this.schema.entityName}:`, error);
      throw error;
    }
    return data as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.schema.endpoint).delete().eq('id', id);
    if (error) {
      console.error(`Error deleting ${this.schema.entityName}:`, error);
      throw error;
    }
  }
}
