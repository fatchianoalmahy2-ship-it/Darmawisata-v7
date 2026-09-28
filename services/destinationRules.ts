import { Bus, Student, AppSettings } from '@/types';

export interface GuideAssignment {
  guide1Name: string;
  secondaryGuideLabel: string;
  secondaryGuideName: string;
  allGuideNames: string[];
  isBali: boolean;
  isYogya: boolean;
}

export class DestinationRulesService {
  /**
   * Identifies whether the wave/destination is Yogyakarta
   */
  public static isYogya(waveOrDestination?: string | null): boolean {
    if (!waveOrDestination) return false;
    const upper = waveOrDestination.toUpperCase();
    return upper.includes('YOGYA') || upper.includes('YOGYAKARTA');
  }

  /**
   * Identifies whether the wave/destination is Bali
   */
  public static isBali(waveOrDestination?: string | null): boolean {
    if (!waveOrDestination) return true; // Default destination
    const upper = waveOrDestination.toUpperCase();
    return upper.includes('BALI') || (!this.isYogya(waveOrDestination) && !upper.includes('MAGANG'));
  }

  /**
   * Resolves the standard 2 chaperones for document signatures:
   * - Bali: Guru Pendamping 1 & Guru Pendamping 3
   * - Yogya: Guru Pendamping 1 & Guru Pendamping 2
   * Dynamically checks customChaperoneSeats (seats 1-4), customBusGuides, and static bus guides.
   */
  public static resolveChaperones(
    waveOrDestination?: string | null,
    bus?: Partial<Bus> | null,
    settings?: AppSettings,
    allChaperones: any[] = []
  ): GuideAssignment {
    const isYogya = this.isYogya(waveOrDestination || bus?.wave);
    const isBali = !isYogya;

    const resolveName = (idOrName?: string): string => {
      if (!idOrName) return '';
      const found = allChaperones.find((c) => c.id === idOrName || c.name === idOrName);
      if (found) return found.name;
      const fromMaster = settings?.masterChaperones?.find((c) => c.id === idOrName || c.name === idOrName);
      if (fromMaster) return fromMaster.name;
      return idOrName;
    };

    const wave = bus?.wave || waveOrDestination || '';
    const busNum = bus?.busNumber || 0;

    const getSeatVal = (seatNum: number): string => {
      if (!busNum) return '';
      const keys = [
        `${wave}_bus-${busNum}_seat-${seatNum}`,
        `${wave}-bus-${busNum}-seat-${seatNum}`,
        `bus-${wave}-${busNum}_seat-${seatNum}`,
        `bus-${busNum}_seat-${seatNum}`,
        `seat-${seatNum}`,
      ];
      for (const k of keys) {
        const val = settings?.customChaperoneSeats?.[k];
        if (val !== undefined && val !== '__STUDENT__' && val !== 'STUDENT' && val !== '__NONE__' && val !== '') {
          return resolveName(val);
        }
      }
      return '';
    };

    const seat1 = getSeatVal(1);
    const seat2 = getSeatVal(2);
    const seat3 = getSeatVal(3);
    const seat4 = getSeatVal(4);

    const customForBus = bus?.id ? settings?.customBusGuides?.[bus.id] : undefined;
    const cg1 = resolveName(customForBus?.guide1);
    const cg2 = resolveName(customForBus?.guide2);
    const cg3 = resolveName(customForBus?.guide3);
    const cg4 = resolveName(customForBus?.guide4);

    const bg1 = resolveName(bus?.guide1);
    const bg2 = resolveName(bus?.guide2);
    const bg3 = resolveName(bus?.guide3);
    const bg4 = resolveName(bus?.guide4);

    const rawG1 = seat1 || cg1 || bg1 || '';
    const rawG2 = seat2 || cg2 || bg2 || '';
    const rawG3 = seat3 || cg3 || bg3 || '';
    const rawG4 = seat4 || cg4 || bg4 || '';

    const cleanGuideName = (n: string) => {
      const idx = n.indexOf('(');
      return idx !== -1 ? n.substring(0, idx).trim() : n.trim();
    };

    const guide1Name = cleanGuideName(rawG1);
    const secondaryGuideLabel = isBali ? 'Guru Pendamping 3' : 'Guru Pendamping 2';
    const secondaryGuideName = cleanGuideName(isBali ? (rawG3 || rawG2 || rawG4) : (rawG2 || rawG3 || rawG4));

    const allGuideNames = [rawG1, rawG2, rawG3, rawG4]
      .filter((g) => g.length > 0)
      .map(cleanGuideName);

    return {
      guide1Name,
      secondaryGuideLabel,
      secondaryGuideName,
      allGuideNames,
      isBali,
      isYogya,
    };
  }

  /**
   * Formats human-readable wave label
   */
  public static formatWaveLabel(wave?: string | null): string {
    if (!wave || wave === 'ALL') return 'Semua Gelombang';
    if (wave.includes('GEL_1') || wave === 'GELOMBANG_1') return 'Gelombang 1 (Bali)';
    if (wave.includes('GEL_2') || wave === 'GELOMBANG_2') return 'Gelombang 2 (Bali)';
    if (wave.includes('YOGYA')) return 'Gelombang Yogyakarta';
    return wave;
  }
}
