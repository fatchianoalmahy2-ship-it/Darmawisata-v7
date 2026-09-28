'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Student, SchoolClass, Bus, Room, AppSettings, DestinationType, WaveType, GenderType, TShirtSize, WaiverType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { getStudentWave, getDepartmentFromClassName } from '@/lib/utils';
import { 
  Bus as BusIcon, 
  BedDouble, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Phone,
  HeartPulse,
  Tag
} from 'lucide-react';

interface UnifiedStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null; // null for new student
  students: Student[];
  classes: SchoolClass[];
  buses: Bus[];
  rooms: Room[];
  settings: AppSettings;
  onSave: (student: Student) => void | Promise<void>;
}

export const UnifiedStudentModal: React.FC<UnifiedStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  students,
  classes,
  buses,
  rooms,
  settings,
  onSave,
}) => {
  // Base details state
  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [gender, setGender] = useState<GenderType>('LAKI-LAKI');
  const [isRegistered, setIsRegistered] = useState(true);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [tShirtSize, setTShirtSize] = useState<TShirtSize | ''>('L');
  const [tShirtDesign, setTShirtDesign] = useState<'A' | 'B'>('A');
  const [waiverType, setWaiverType] = useState<WaiverType>('NONE');

  // Unified allocation state
  const [destination, setDestination] = useState<DestinationType>('BALI');
  const [wave, setWave] = useState<WaveType>('BALI_GEL_1');
  const [busNumber, setBusNumber] = useState<number | ''>('');
  const [seatNumber, setSeatNumber] = useState<number | ''>('');
  const [roomNumber, setRoomNumber] = useState<number | ''>('');
  const [bedNumber, setBedNumber] = useState<number | ''>('');
  const [nisError, setNisError] = useState<string>('');
  const [pendingStudentToSave, setPendingStudentToSave] = useState<Student | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Populate data when modal opens or editing student changes
  useEffect(() => {
    if (!isOpen) return;

    if (student) {
      setNis(student.nis || '');
      setName(student.name || '');
      setClassName(student.className || (classes[0]?.name || ''));
      setGender(student.gender || 'LAKI-LAKI');
      setIsRegistered(student.isRegistered ?? true);
      setParentName(student.parentName || '');
      setParentPhone(student.parentPhone || '');
      setStudentPhone(student.studentPhone || '');
      setAddress(student.address || '');
      setMedicalHistory(student.medicalHistory || '');
      setTShirtSize(student.tShirtSize || 'L');
      setTShirtDesign(student.tShirtDesign || 'A');
      setWaiverType(student.waiverType || 'NONE');

      const dest = student.destination || settings?.defaultTourDestination || 'BALI';
      setDestination(dest);

      const calculatedWave = getStudentWave(
        { destination: dest, className: student.className },
        settings,
        classes
      );
      setWave(calculatedWave);

      setBusNumber(student.busNumber || '');
      setSeatNumber(student.seatNumber || '');
      setRoomNumber(student.roomNumber || '');
      // If room has seatNumber representing bed, or roomNumber exists
      setBedNumber(student.seatNumber || '');
    } else {
      // New student defaults
      const firstClass = classes[0]?.name || '';
      setNis('');
      setName('');
      setClassName(firstClass);
      setGender('LAKI-LAKI');
      setIsRegistered(true);
      setParentName('');
      setParentPhone('');
      setStudentPhone('');
      setAddress('');
      setMedicalHistory('');
      setTShirtSize('L');
      setTShirtDesign('A');
      setWaiverType('NONE');

      const defaultDest = (settings?.defaultTourDestination as DestinationType) || 'BALI';
      setDestination(defaultDest);

      const defaultWave = getStudentWave(
        { destination: defaultDest, className: firstClass },
        settings,
        classes
      );
      setWave(defaultWave);

      setBusNumber('');
      setSeatNumber('');
      setRoomNumber('');
      setBedNumber('');
    }
  }, [isOpen, student, classes, settings]);

  // Handle Destination Change -> Auto Align Wave and Clean Incompatible Allocations
  const handleDestinationChange = (newDest: DestinationType) => {
    setDestination(newDest);
    const newWave = getStudentWave({ destination: newDest, className }, settings, classes);
    setWave(newWave);
    // Reset bus and room when destination changes to prevent orphan allocations
    setBusNumber('');
    setSeatNumber('');
    setRoomNumber('');
    setBedNumber('');
  };

  // Handle Class Change -> Recalculate Wave
  const handleClassChange = (newClass: string) => {
    setClassName(newClass);
    const newWave = getStudentWave({ destination, className: newClass }, settings, classes);
    if (newWave !== wave) {
      setBusNumber('');
      setSeatNumber('');
      setRoomNumber('');
      setBedNumber('');
    }
    setWave(newWave);
  };

  // 1. Compute Available Buses for Current Destination & Wave
  const availableBusesForWave = useMemo(() => {
    if (destination === 'MAGANG') return [];

    // Filter buses that match this wave
    const waveBuses = buses.filter((b) => b.wave === wave);
    if (waveBuses.length > 0) {
      return waveBuses;
    }

    // Fallback: If buses state is not generated yet, provide virtual 1..10 buses
    return Array.from({ length: 8 }, (_, i) => ({
      busNumber: i + 1,
      wave,
      capacity: settings?.defaultBusCapacity || 50,
      studentCount: students.filter((s) => s.wave === wave && s.busNumber === i + 1 && s.id !== student?.id).length,
      students: [],
    }));
  }, [buses, destination, wave, students, settings, student]);

  // 2. Compute Occupied Seats in the selected bus (excluding current student)
  const occupiedSeatNumbers = useMemo(() => {
    if (!busNumber) return new Set<number>();

    const occupied = new Set<number>();
    students.forEach((s) => {
      if (s.id !== student?.id && s.wave === wave && s.busNumber === Number(busNumber) && s.seatNumber) {
        occupied.add(s.seatNumber);
      }
    });
    return occupied;
  }, [students, student, wave, busNumber]);

  // Capacity of current selected bus
  const currentBusCapacity = useMemo(() => {
    const selected = availableBusesForWave.find((b) => b.busNumber === Number(busNumber));
    return selected?.capacity || settings?.defaultBusCapacity || 50;
  }, [availableBusesForWave, busNumber, settings]);

  // List of available seat numbers
  const availableSeats = useMemo(() => {
    const seats: number[] = [];
    for (let i = 1; i <= currentBusCapacity; i++) {
      if (!occupiedSeatNumbers.has(i) || i === (student?.busNumber === busNumber ? student?.seatNumber : -1)) {
        seats.push(i);
      }
    }
    return seats;
  }, [currentBusCapacity, occupiedSeatNumbers, student, busNumber]);

  // 3. Compute Available Rooms for Current Destination & Gender
  const availableRoomsForWaveAndGender = useMemo(() => {
    if (destination === 'MAGANG') return [];

    // Rooms with matching wave & gender
    const waveRooms = rooms.filter((r) => r.wave === wave && (r.gender === gender || r.gender === 'ALL' || !r.gender));
    if (waveRooms.length > 0) {
      return waveRooms;
    }

    // Fallback list of rooms from students
    const roomNumbers = Array.from(
      new Set(
        students
          .filter((s) => s.wave === wave && s.roomNumber)
          .map((s) => s.roomNumber!)
      )
    ).sort((a, b) => a - b);

    // If no rooms exist yet, generate default 101..120
    const defaultRoomList = roomNumbers.length > 0 ? roomNumbers : Array.from({ length: 20 }, (_, i) => 101 + i);

    return defaultRoomList.map((rNum) => {
      const occupants = students.filter((s) => s.wave === wave && s.roomNumber === rNum && s.id !== student?.id);
      return {
        roomNumber: rNum,
        wave,
        gender: gender,
        capacity: settings?.defaultRoomCapacity || 4,
        occupantsCount: occupants.length,
      };
    });
  }, [rooms, destination, wave, gender, students, settings, student]);

  // Occupied beds in selected room
  const occupiedBedNumbers = useMemo(() => {
    if (!roomNumber) return new Set<number>();
    const occupied = new Set<number>();
    students.forEach((s) => {
      if (s.id !== student?.id && s.wave === wave && s.roomNumber === Number(roomNumber) && s.seatNumber) {
        occupied.add(s.seatNumber);
      }
    });
    return occupied;
  }, [students, student, wave, roomNumber]);

  const currentRoomCapacity = useMemo(() => {
    const selected = availableRoomsForWaveAndGender.find((r) => r.roomNumber === Number(roomNumber));
    return selected?.capacity || settings?.defaultRoomCapacity || 4;
  }, [availableRoomsForWaveAndGender, roomNumber, settings]);

  const availableBeds = useMemo(() => {
    const beds: number[] = [];
    for (let i = 1; i <= currentRoomCapacity; i++) {
      if (!occupiedBedNumbers.has(i) || i === (student?.roomNumber === roomNumber ? student?.seatNumber : -1)) {
        beds.push(i);
      }
    }
    return beds;
  }, [currentRoomCapacity, occupiedBedNumbers, student, roomNumber]);

  // When bus is selected, auto-suggest first available seat if currently empty
  const handleBusSelect = (newBus: string) => {
    if (!newBus) {
      setBusNumber('');
      setSeatNumber('');
      return;
    }
    const bNum = Number(newBus);
    setBusNumber(bNum);

    // If seat is empty or currently occupied in the new bus, select the first available seat
    const occupiedInNewBus = new Set<number>();
    students.forEach((s) => {
      if (s.id !== student?.id && s.wave === wave && s.busNumber === bNum && s.seatNumber) {
        occupiedInNewBus.add(s.seatNumber);
      }
    });
    for (let i = 1; i <= currentBusCapacity; i++) {
      if (!occupiedInNewBus.has(i)) {
        setSeatNumber(i);
        break;
      }
    }
  };

  // When room is selected, auto-suggest first available bed
  const handleRoomSelect = (newRoom: string) => {
    if (!newRoom) {
      setRoomNumber('');
      setBedNumber('');
      return;
    }
    const rNum = Number(newRoom);
    setRoomNumber(rNum);

    const occupiedInNewRoom = new Set<number>();
    students.forEach((s) => {
      if (s.id !== student?.id && s.wave === wave && s.roomNumber === rNum && s.seatNumber) {
        occupiedInNewRoom.add(s.seatNumber);
      }
    });
    for (let i = 1; i <= currentRoomCapacity; i++) {
      if (!occupiedInNewRoom.has(i)) {
        setBedNumber(i);
        break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNisError('');

    const trimmedNis = nis.trim();
    if (!trimmedNis) {
      setNisError('NIS wajib diisi');
      return;
    }

    // Check duplicate NIS when creating or changing NIS
    const isDuplicate = students.some(
      (s) => s.nis && s.nis.trim() === trimmedNis && s.id !== student?.id
    );
    if (isDuplicate) {
      setNisError(`NIS "${trimmedNis}" sudah terdaftar pada siswa lain!`);
      return;
    }

    const deterministicWave = getStudentWave({ destination, className }, settings, classes);

    const finalStudent: Student = {
      ...(student?.id ? { id: student.id } : {}),
      nis: trimmedNis,
      name: name.trim(),
      className,
      gender,
      destination,
      wave: deterministicWave,
      busNumber: busNumber !== '' ? Number(busNumber) : undefined,
      seatNumber: seatNumber !== '' ? Number(seatNumber) : undefined,
      roomNumber: roomNumber !== '' ? Number(roomNumber) : undefined,
      isRegistered,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      studentPhone: studentPhone.trim(),
      address: address.trim(),
      medicalHistory: medicalHistory.trim(),
      tShirtSize: (tShirtSize as TShirtSize) || undefined,
      tShirtDesign: tShirtDesign || undefined,
      waiverType: waiverType || 'NONE',
      updatedAt: new Date().toISOString(),
    } as Student;

    setPendingStudentToSave(finalStudent);
    setIsConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (pendingStudentToSave) {
      await onSave(pendingStudentToSave);
      setPendingStudentToSave(null);
      setIsConfirmOpen(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student ? `Edit Siswa: ${student.name}` : 'Tambah Siswa Baru Terpadu'}
      subtitle="Kelola biodata, destinasi, penempatan bus & kursi, serta alokasi kamar dalam satu formulir"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: IDENTITAS UTAMA */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs pb-1.5 border-b border-slate-200">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Identitas Pokok Siswa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                NIS <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nis}
                onChange={(e) => {
                  setNis(e.target.value);
                  if (nisError) setNisError('');
                }}
                placeholder="Contoh: 12345"
                className={`w-full px-3 py-2 bg-white border ${nisError ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 focus:ring-emerald-500'} rounded-xl text-xs font-bold focus:ring-2`}
              />
              {nisError && <p className="text-[10px] font-bold text-rose-600 mt-1">{nisError}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kelas <span className="text-rose-500">*</span>
              </label>
              <select
                value={className}
                onChange={(e) => handleClassChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                {classes.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => {
                  const g = e.target.value as GenderType;
                  setGender(g);
                  setRoomNumber('');
                  setBedNumber('');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="LAKI-LAKI">LAKI-LAKI (Putra)</option>
                <option value="PEREMPUAN">PEREMPUAN (Putri)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Pendaftaran</label>
              <select
                value={isRegistered ? 'true' : 'false'}
                onChange={(e) => setIsRegistered(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="true">Terdaftar & Lunas</option>
                <option value="false">Belum Lunas / Batal</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: DESTINASI & GELOMBANG */}
        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Destinasi & Gelombang Keberangkatan</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Auto-Wave Synchronized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tujuan Tour</label>
              <select
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value as DestinationType)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="BALI">BALI (Darmawisata)</option>
                <option value="YOGYAKARTA">YOGYAKARTA (Study Tour)</option>
                <option value="MAGANG">MAGANG / PKL (Tidak Ikut)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Gelombang / Sesi</label>
              <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${wave === 'BALI_GEL_2' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                  {wave === 'BALI_GEL_1'
                    ? 'Bali - Gelombang 1'
                    : wave === 'BALI_GEL_2'
                    ? 'Bali - Gelombang 2'
                    : 'Yogyakarta - Gelombang 1'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {className ? `Jurusan ${getDepartmentFromClassName(className)}` : 'Berdasarkan Jurusan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: PENEMPATAN ARMADA BUS & KURSI */}
        {destination !== 'MAGANG' && (
          <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-200/80 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-sky-200">
              <div className="flex items-center gap-2 text-sky-950 font-bold text-xs">
                <BusIcon className="w-4 h-4 text-sky-600" />
                <span>Alokasi Bus & Nomor Kursi Denah</span>
              </div>
              {busNumber && seatNumber ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Duduk di Bus {busNumber} No. {seatNumber}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Belum Dipilih
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilih Bus</label>
                <select
                  value={busNumber}
                  onChange={(e) => handleBusSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs font-bold text-sky-950 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="">-- Belum Dialokasikan ke Bus --</option>
                  {availableBusesForWave.map((b) => {
                    const count = students.filter(
                      (s) => s.wave === wave && s.busNumber === b.busNumber && s.id !== student?.id
                    ).length;
                    const cap = b.capacity || 50;
                    return (
                      <option key={b.busNumber} value={b.busNumber}>
                        Bus {b.busNumber} ({count}/{cap} Kursi Terisi)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilih Nomor Kursi (Denah Fisik)</label>
                <select
                  disabled={!busNumber}
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 transition-colors ${
                    !busNumber
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-sky-300 text-sky-950 cursor-pointer'
                  }`}
                >
                  <option value="">-- Pilih Kursi Kosong --</option>
                  {availableSeats.map((sNum) => (
                    <option key={sNum} value={sNum}>
                      Kursi #{sNum} {sNum === student?.seatNumber && student?.busNumber === busNumber ? '(Kursi Saat Ini)' : '(Tersedia)'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Memilih nomor kursi ini akan langsung menempatkan siswa pada denah visual bus secara permanen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: PENEMPATAN HOTEL & KAMAR */}
        {destination !== 'MAGANG' && (
          <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                <BedDouble className="w-4 h-4 text-indigo-600" />
                <span>Alokasi Kamar Hotel ({gender === 'LAKI-LAKI' ? 'Putra' : 'Putri'})</span>
              </div>
              {roomNumber ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Kamar {roomNumber}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Belum Ada Kamar
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Kamar Hotel</label>
                <select
                  value={roomNumber}
                  onChange={(e) => handleRoomSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Belum Dialokasikan ke Kamar --</option>
                  {availableRoomsForWaveAndGender.map((r) => {
                    const count = students.filter(
                      (s) => s.wave === wave && s.roomNumber === r.roomNumber && s.id !== student?.id
                    ).length;
                    const cap = r.capacity || 4;
                    return (
                      <option key={r.roomNumber} value={r.roomNumber}>
                        Kamar {r.roomNumber} ({count}/{cap} Kasur Terisi)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Tempat Tidur / Slot</label>
                <select
                  disabled={!roomNumber}
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    !roomNumber
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-indigo-300 text-indigo-950 cursor-pointer'
                  }`}
                >
                  <option value="">-- Pilih Kasur --</option>
                  {availableBeds.map((bNum) => (
                    <option key={bNum} value={bNum}>
                      Kasur #{bNum} (Tersedia)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: DATA TAMBAHAN (KAOS & KONTAK) */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs pb-1.5 border-b border-slate-200">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>Perlengkapan & Kontak Darurat</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Ukuran Kaos</label>
              <select
                value={tShirtSize}
                onChange={(e) => setTShirtSize(e.target.value as TShirtSize)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="S">Ukuran S</option>
                <option value="M">Ukuran M</option>
                <option value="L">Ukuran L</option>
                <option value="XL">Ukuran XL</option>
                <option value="XXL">Ukuran XXL</option>
                <option value="3XL">Ukuran 3XL</option>
                <option value="4XL">Ukuran 4XL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Desain Kaos</label>
              <select
                value={tShirtDesign}
                onChange={(e) => setTShirtDesign(e.target.value as 'A' | 'B')}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="A">Desain A</option>
                <option value="B">Desain B</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jalur Beasiswa / Keringanan</label>
              <select
                value={waiverType}
                onChange={(e) => setWaiverType(e.target.value as WaiverType)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="NONE">Reguler (Normal)</option>
                <option value="25%">Diskon 25% (Jalur Keringanan)</option>
                <option value="50%">Diskon 50% (Jalur Keringanan)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp Siswa</label>
              <input
                type="text"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp Orang Tua</label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Riwayat Kesehatan / Penyakit</label>
            <input
              type="text"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="Contoh: Asma, Alergi Makanan Laut (atau 'TIDAK ADA')"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* MODAL ACTIONS */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{student ? 'Simpan Perubahan Terpadu' : 'Tambahkan Siswa'}</span>
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmedSave}
        title={student ? 'Konfirmasi Perubahan Siswa' : 'Konfirmasi Penambahan Siswa Baru'}
        message={`Apakah Anda yakin ingin ${student ? 'memperbarui' : 'menyimpan'} data siswa "${pendingStudentToSave?.name || name}"?`}
        actionType={student ? 'update' : 'create'}
        dataSummary={pendingStudentToSave ? [
          { label: 'NIS', value: pendingStudentToSave.nis || '-' },
          { label: 'Nama Lengkap', value: pendingStudentToSave.name || '-' },
          { label: 'Kelas', value: pendingStudentToSave.className || '-' },
          { label: 'Jenis Kelamin', value: pendingStudentToSave.gender || '-' },
          { label: 'Destinasi', value: pendingStudentToSave.destination || '-' },
          { label: 'Bus & Kursi', value: pendingStudentToSave.busNumber ? `Bus ${pendingStudentToSave.busNumber} (Kursi ${pendingStudentToSave.seatNumber || '-'})` : 'Belum diisi' },
          { label: 'Nomor Kamar', value: pendingStudentToSave.roomNumber ? `Kamar ${pendingStudentToSave.roomNumber}` : 'Belum diisi' },
        ] : []}
      />
    </Modal>
  );
};
