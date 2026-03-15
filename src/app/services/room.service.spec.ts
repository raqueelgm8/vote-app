import { firstValueFrom, of } from 'rxjs';
import { RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;
  const firestoreStub = {} as any;
  let serviceAny: any;

  beforeEach(() => {
    service = new RoomService(firestoreStub);
    serviceAny = service as any;
    serviceAny.docFn = jasmine.createSpy('docFn').and.returnValue({ id: 'DEFAULT' });
    serviceAny.getDocFn = jasmine.createSpy('getDocFn').and.resolveTo({ exists: () => false });
    serviceAny.setDocFn = jasmine.createSpy('setDocFn').and.resolveTo();
    serviceAny.updateDocFn = jasmine.createSpy('updateDocFn').and.resolveTo();
    serviceAny.collectionFn = jasmine.createSpy('collectionFn').and.returnValue({ id: 'rooms' });
    serviceAny.collectionDataFn = jasmine.createSpy('collectionDataFn').and.returnValue(of([]));
    serviceAny.docDataFn = jasmine.createSpy('docDataFn').and.returnValue(of({}));
    serviceAny.incrementFn = jasmine.createSpy('incrementFn').and.returnValue('inc');
    serviceAny.nowFn = jasmine.createSpy('nowFn').and.returnValue({ toDate: () => new Date('2024-01-01T00:00:00Z') });
    serviceAny.fromDateFn = jasmine.createSpy('fromDateFn').and.returnValue({ seconds: 0 });
  });

  it('createRoom throws when room already exists', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({ exists: () => true } as any);

    await expectAsync(
      service.createRoom('Sala', 'ABC', 'admin', ['A', 'B'], 3)
    ).toBeRejected();
  });

  it('createRoom persists data with safe duration', async () => {
    const docRef = { id: 'ABC' } as any;
    const now = { toDate: () => new Date('2024-01-01T00:00:00Z') };
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({ exists: () => false } as any);
    const setSpy = serviceAny.setDocFn.and.resolveTo();
    serviceAny.nowFn.and.returnValue(now as any);

    await service.createRoom('Sala', 'ABC', 'admin', ['A', 'B'], -5);

    const setArgs = setSpy.calls.mostRecent().args;
    expect(setArgs[0]).toBe(docRef);
    expect(setArgs[1]).toEqual(jasmine.objectContaining({
      name: 'Sala',
      code: 'ABC',
      createdBy: 'admin',
      status: 'waiting',
      options: ['A', 'B'],
      votes: { A: 0, B: 0 },
      durationMinutes: 3,
      createdAt: now
    }));
  });

  it('getRooms returns collectionData stream', async () => {
    const collectionRef = { id: 'rooms' } as any;
    serviceAny.collectionFn.and.returnValue(collectionRef);
    serviceAny.collectionDataFn.and.returnValue(of([{ code: 'A' }]));

    const rooms = await firstValueFrom(service.getRooms());
    expect(rooms).toEqual([{ code: 'A' }]);
  });

  it('getRoomByCode returns docData stream', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.docDataFn.and.returnValue(of({ code: 'ABC' }));

    const room = await firstValueFrom(service.getRoomByCode('ABC'));
    expect(room).toEqual({ code: 'ABC' });
  });

  it('startVoting sets status and endsAt', async () => {
    const docRef = { id: 'ABC' } as any;
    const now = { toDate: () => new Date('2024-01-01T00:00:00Z') };
    const endsAt = { seconds: 123 } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: ['A'], durationMinutes: 2 })
    } as any);
    serviceAny.nowFn.and.returnValue(now as any);
    serviceAny.fromDateFn.and.returnValue(endsAt);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.startVoting('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      status: 'voting',
      startedAt: now,
      endsAt,
      votes: { A: 0 },
      totalVotes: 0
    }));
  });

  it('updateOptions updates votes and totalVotes', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.updateOptions('ABC', ['A', 'B']);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      options: ['A', 'B'],
      votes: { A: 0, B: 0 },
      totalVotes: 0
    }));
  });

  it('updateRoomSettings saves duration and options', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({ exists: () => true, data: () => ({}) } as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.updateRoomSettings('ABC', ['A'], 5);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      options: ['A'],
      votes: { A: 0 },
      totalVotes: 0,
      durationMinutes: 5
    }));
  });

  it('vote increments counts', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.incrementFn.and.returnValue('inc' as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.vote('ABC', 'A');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      'votes.A': 'inc',
      totalVotes: 'inc'
    }));
  });

  it('closeVoting marks room as closed', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.closeVoting('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({ status: 'closed' }));
  });

  it('archiveRoom marks room as archived with timestamp', async () => {
    const docRef = { id: 'ABC' } as any;
    const now = { toDate: () => new Date('2024-01-01T00:00:00Z') };
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.nowFn.and.returnValue(now as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.archiveRoom('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      status: 'archived',
      archivedAt: now
    }));
  });
});
