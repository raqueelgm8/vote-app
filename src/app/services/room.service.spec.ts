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
    serviceAny.randomFn = jasmine.createSpy('randomFn').and.returnValue(0);
  });

  it('createRoom throws when room already exists', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({ exists: () => true } as any);

    await expectAsync(
      service.createRoom('Sala', 'ABC', 'admin', ['A', 'B'], 3)
    ).toBeRejected();
  });

  it('createRoom persists data with safe duration and order', async () => {
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
      order: [1, 0],
      currentIndex: 0,
      preScores: {},
      finalVotes: {},
      votes: { A: 0, B: 0 },
      durationMinutes: 3,
      createdAt: now
    }));
  });

  it('createRoom keeps valid duration when provided', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({ exists: () => false } as any);
    const setSpy = serviceAny.setDocFn.and.resolveTo();

    await service.createRoom('Sala', 'ABC', 'admin', ['A', 'B'], 7);

    const setArgs = setSpy.calls.mostRecent().args;
    expect(setArgs[1]).toEqual(jasmine.objectContaining({
      durationMinutes: 7
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

  it('startVoting throws when room not found', async () => {
    serviceAny.getDocFn.and.resolveTo({ exists: () => false } as any);
    await expectAsync(service.startVoting('ABC')).toBeRejected();
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
      finalVotes: {},
      votes: { A: 0 },
      totalVotes: 0
    }));
  });

  it('startVoting handles missing options and invalid duration', async () => {
    const docRef = { id: 'ABC' } as any;
    const nowDate = new Date('2024-01-01T00:00:00Z');
    const now = { toDate: () => nowDate };
    const endsAt = { seconds: 222 } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: null, durationMinutes: undefined })
    } as any);
    serviceAny.nowFn.and.returnValue(now as any);
    serviceAny.fromDateFn.and.returnValue(endsAt);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.startVoting('ABC');

    const expectedEndsAt = new Date(nowDate.getTime() + 3 * 60 * 1000);
    expect(serviceAny.fromDateFn).toHaveBeenCalled();
    expect(serviceAny.fromDateFn.calls.mostRecent().args[0].getTime()).toBe(expectedEndsAt.getTime());
    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      votes: {},
      endsAt
    }));
  });

  it('startReveal throws when room not found', async () => {
    serviceAny.getDocFn.and.resolveTo({ exists: () => false } as any);
    await expectAsync(service.startReveal('ABC')).toBeRejected();
  });

  it('startReveal sets status and order', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: ['A', 'B'], order: [1, 0] })
    } as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.startReveal('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      status: 'reveal',
      order: [1, 0],
      currentIndex: 0
    }));
  });

  it('startReveal handles missing options array', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: null })
    } as any);

    await expectAsync(service.startReveal('ABC')).toBeRejected();
  });

  it('startReveal rebuilds order when length mismatches', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: ['A', 'B', 'C'], order: [1, 0] })
    } as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.startReveal('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      order: [1, 2, 0]
    }));
  });

  it('startReveal throws when not enough participants', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: ['A'] })
    } as any);

    await expectAsync(service.startReveal('ABC')).toBeRejected();
  });

  it('nextParticipant throws when room not found', async () => {
    serviceAny.getDocFn.and.resolveTo({ exists: () => false } as any);
    await expectAsync(service.nextParticipant('ABC')).toBeRejected();
  });

  it('nextParticipant increments currentIndex safely', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: ['A', 'B'], order: [1, 0], currentIndex: 1 })
    } as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.nextParticipant('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({ currentIndex: 1 }));
  });

  it('nextParticipant falls back when options and index are missing', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.getDocFn.and.resolveTo({
      exists: () => true,
      data: () => ({ options: null, order: null, currentIndex: undefined })
    } as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.nextParticipant('ABC');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({ currentIndex: 0, order: [] }));
  });

  it('updateOptions resets votes and totals', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.updateOptions('ABC', ['A', 'B']);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      options: ['A', 'B'],
      votes: { A: 0, B: 0 },
      totalVotes: 0
    }));
  });

  it('updateRoomSettings saves duration, order and resets scores', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.updateRoomSettings('ABC', ['A', 'B'], 5);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      options: ['A', 'B'],
      order: [1, 0],
      currentIndex: 0,
      preScores: {},
      finalVotes: {},
      votes: { A: 0, B: 0 },
      totalVotes: 0,
      durationMinutes: 5
    }));
  });

  it('updateRoomSettings uses safe duration when invalid', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.updateRoomSettings('ABC', ['A', 'B'], 0);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      durationMinutes: 3
    }));
  });

  it('vote increments counts and stores final vote when voterId provided', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.incrementFn.and.returnValue('inc' as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.vote('ABC', 'A', 'v-1');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[0]).toBe(docRef);
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      'votes.A': 'inc',
      totalVotes: 'inc',
      'finalVotes.v-1': 'A'
    }));
  });

  it('vote increments counts without final vote when voterId missing', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    serviceAny.incrementFn.and.returnValue('inc' as any);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.vote('ABC', 'A');

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      'votes.A': 'inc',
      totalVotes: 'inc'
    }));
    expect(updateArgs[1]['finalVotes.v-1']).toBeUndefined();
  });

  it('savePreScore clamps score between 0 and 10', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.savePreScore('ABC', 'v-1', 'Ana', 11);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      'preScores.v-1.Ana': 10
    }));
  });

  it('savePreScore clamps negative scores to 0', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.savePreScore('ABC', 'v-1', 'Ana', -2);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      'preScores.v-1.Ana': 0
    }));
  });

  it('savePreScore clamps non-finite scores to 0', async () => {
    const docRef = { id: 'ABC' } as any;
    serviceAny.docFn.and.returnValue(docRef);
    const updateSpy = serviceAny.updateDocFn.and.resolveTo();

    await service.savePreScore('ABC', 'v-1', 'Ana', Number.NaN);

    const updateArgs = updateSpy.calls.mostRecent().args;
    expect(updateArgs[1]).toEqual(jasmine.objectContaining({
      'preScores.v-1.Ana': 0
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
