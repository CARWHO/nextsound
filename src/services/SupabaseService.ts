import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/config';
import { ISongUpvote } from '@/types';

/**
 * SupabaseService - Handles all interactions with Supabase for song upvotes
 * No authentication required - anonymous upvoting enabled
 */
class SupabaseService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `${SUPABASE_URL}/rest/v1`;
    this.headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  /**
   * Get upvote count for a specific track
   * @param trackId - The Spotify track ID
   * @returns The upvote record or null if not found
   */
  async getUpvoteCount(trackId: string): Promise<ISongUpvote | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/song_upvotes?track_id=eq.${trackId}&select=*`,
        {
          method: 'GET',
          headers: this.headers
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch upvote count:', response.statusText);
        return null;
      }

      const data: ISongUpvote[] = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching upvote count:', error);
      return null;
    }
  }

  /**
   * Initialize a track's upvote record if it doesn't exist
   * @param trackId - The Spotify track ID
   * @returns The created or existing upvote record
   */
  async initializeTrackUpvotes(trackId: string): Promise<ISongUpvote | null> {
    try {
      // First check if it already exists
      const existing = await this.getUpvoteCount(trackId);
      if (existing) {
        return existing;
      }

      // Create new record
      const response = await fetch(`${this.baseUrl}/song_upvotes`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          track_id: trackId,
          upvote_count: 0
        })
      });

      if (!response.ok) {
        console.error('Failed to initialize track upvotes:', response.statusText);
        return null;
      }

      const data: ISongUpvote[] = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error initializing track upvotes:', error);
      return null;
    }
  }

  /**
   * Increment upvote count for a track
   * @param trackId - The Spotify track ID
   * @returns The updated upvote record
   */
  async incrementUpvote(trackId: string): Promise<ISongUpvote | null> {
    try {
      // Get current count
      let record = await this.getUpvoteCount(trackId);
      
      // Initialize if doesn't exist
      if (!record) {
        record = await this.initializeTrackUpvotes(trackId);
        if (!record) return null;
      }

      const newCount = record.upvote_count + 1;

      // Update the count
      const response = await fetch(
        `${this.baseUrl}/song_upvotes?track_id=eq.${trackId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            upvote_count: newCount
          })
        }
      );

      if (!response.ok) {
        console.error('Failed to increment upvote:', response.statusText);
        return null;
      }

      const data: ISongUpvote[] = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error incrementing upvote:', error);
      return null;
    }
  }

  /**
   * Decrement upvote count for a track
   * @param trackId - The Spotify track ID
   * @returns The updated upvote record
   */
  async decrementUpvote(trackId: string): Promise<ISongUpvote | null> {
    try {
      // Get current count
      const record = await this.getUpvoteCount(trackId);
      
      if (!record) {
        console.warn('Cannot decrement upvote for non-existent track');
        return null;
      }

      // Don't go below 0
      const newCount = Math.max(0, record.upvote_count - 1);

      // Update the count
      const response = await fetch(
        `${this.baseUrl}/song_upvotes?track_id=eq.${trackId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            upvote_count: newCount
          })
        }
      );

      if (!response.ok) {
        console.error('Failed to decrement upvote:', response.statusText);
        return null;
      }

      const data: ISongUpvote[] = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error decrementing upvote:', error);
      return null;
    }
  }

  /**
   * Get multiple tracks' upvote counts in a single request
   * @param trackIds - Array of Spotify track IDs
   * @returns Map of track IDs to upvote counts
   */
  async getBulkUpvoteCounts(trackIds: string[]): Promise<Map<string, number>> {
    try {
      const trackIdsParam = trackIds.map(id => `"${id}"`).join(',');
      const response = await fetch(
        `${this.baseUrl}/song_upvotes?track_id=in.(${trackIdsParam})&select=track_id,upvote_count`,
        {
          method: 'GET',
          headers: this.headers
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch bulk upvote counts:', response.statusText);
        return new Map();
      }

      const data: Array<{ track_id: string; upvote_count: number }> = await response.json();
      
      const countMap = new Map<string, number>();
      data.forEach(item => {
        countMap.set(item.track_id, item.upvote_count);
      });

      return countMap;
    } catch (error) {
      console.error('Error fetching bulk upvote counts:', error);
      return new Map();
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
export default supabaseService;

