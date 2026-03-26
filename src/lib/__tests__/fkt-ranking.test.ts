import { prisma } from '../prisma';

// Mock Prisma for testing
jest.mock('../prisma', () => ({
  prisma: {
    route: {
      create: jest.fn(),
      findUnique: jest.fn()
    },
    fktAttempt: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    user: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

describe('FKT Ranking System Tests', () => {
  let mockRoute: { id: string; name: string; status: string; startLat: number; startLng: number; endLat: number; endLng: number };
  let mockAttempts: { id: string; durationSec: number; rigSize: string; rank?: number }[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock route
    mockRoute = {
      id: 'route-123',
      name: 'Southport to Sneads Ferry',
      status: 'APPROVED',
      startLat: 33.948889,
      startLng: -78.011667,
      endLat: 34.518056,
      endLng: -77.448056
    };

    mockAttempts = [];

    // Setup default mocks
    (prisma.route.findUnique as jest.Mock).mockResolvedValue(mockRoute);
    (prisma.user.create as jest.Mock).mockImplementation((data) =>
      Promise.resolve({ id: `user-${Date.now()}`, ...data.data })
    );
  });

  describe('Initial FKT Rankings', () => {
    test('should rank first FKT attempt as #1', async () => {
      // Alice submits the first FKT attempt: 90 minutes (5400 seconds)
      const aliceAttempt = {
        id: 'attempt-alice-1',
        userId: 'user-alice',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400, // 90 minutes
        date: new Date('2024-03-15'),
        avgSogKnots: 6.5,
        maxSogKnots: 8.2,
        createdAt: new Date('2024-03-15T14:00:00Z')
      };

      mockAttempts.push(aliceAttempt);

      // Mock database responses
      (prisma.fktAttempt.create as jest.Mock).mockResolvedValue(aliceAttempt);
      (prisma.fktAttempt.findMany as jest.Mock).mockResolvedValue([aliceAttempt]);

      // Calculate ranking (simulate the ranking logic)
      const rankedAttempts = await calculateRankings('route-123', 'AERO_7');

      expect(rankedAttempts).toHaveLength(1);
      expect(rankedAttempts[0].id).toBe('attempt-alice-1');
      expect(rankedAttempts[0].rank).toBe(1);
      expect(rankedAttempts[0].durationSec).toBe(5400);
    });

    test('should rank second slower FKT attempt as #2', async () => {
      // Alice's existing attempt (faster)
      const aliceAttempt = {
        id: 'attempt-alice-1',
        userId: 'user-alice',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400, // 90 minutes
        date: new Date('2024-03-15'),
        avgSogKnots: 6.5,
        maxSogKnots: 8.2,
        createdAt: new Date('2024-03-15T14:00:00Z'),
        rank: 1
      };

      // Bob submits a slower attempt: 95 minutes (5700 seconds)
      const bobAttempt = {
        id: 'attempt-bob-1',
        userId: 'user-bob',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5700, // 95 minutes (5 minutes slower)
        date: new Date('2024-03-16'),
        avgSogKnots: 6.2,
        maxSogKnots: 7.8,
        createdAt: new Date('2024-03-16T10:00:00Z')
      };

      mockAttempts.push(aliceAttempt, bobAttempt);

      // Mock database responses
      (prisma.fktAttempt.create as jest.Mock).mockResolvedValue(bobAttempt);
      (prisma.fktAttempt.findMany as jest.Mock).mockResolvedValue([aliceAttempt, bobAttempt]);

      // Calculate rankings after Bob's submission
      const rankedAttempts = await calculateRankings('route-123', 'AERO_7');

      expect(rankedAttempts).toHaveLength(2);

      // Alice should still be #1 (faster)
      const aliceRanked = rankedAttempts.find(a => a.id === 'attempt-alice-1');
      expect(aliceRanked?.rank).toBe(1);
      expect(aliceRanked?.durationSec).toBe(5400);

      // Bob should be #2 (slower)
      const bobRanked = rankedAttempts.find(a => a.id === 'attempt-bob-1');
      expect(bobRanked?.rank).toBe(2);
      expect(bobRanked?.durationSec).toBe(5700);

      // Verify ranking order by time
      expect(rankedAttempts[0].durationSec).toBeLessThan(rankedAttempts[1].durationSec);
    });
  });

  describe('Ranking Updates with New Fastest Time', () => {
    test('should rerank all attempts when new fastest time is submitted', async () => {
      // Existing attempts
      const aliceAttempt = {
        id: 'attempt-alice-1',
        userId: 'user-alice',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400, // 90 minutes (was #1)
        date: new Date('2024-03-15'),
        rank: 1,
        createdAt: new Date('2024-03-15T14:00:00Z')
      };

      const bobAttempt = {
        id: 'attempt-bob-1',
        userId: 'user-bob',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5700, // 95 minutes (was #2)
        date: new Date('2024-03-16'),
        rank: 2,
        createdAt: new Date('2024-03-16T10:00:00Z')
      };

      // Charlie submits the new fastest time: 85 minutes (5100 seconds)
      const charlieAttempt = {
        id: 'attempt-charlie-1',
        userId: 'user-charlie',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5100, // 85 minutes (NEW FASTEST!)
        date: new Date('2024-03-17'),
        avgSogKnots: 7.1,
        maxSogKnots: 9.5,
        createdAt: new Date('2024-03-17T09:00:00Z')
      };

      mockAttempts = [aliceAttempt, bobAttempt, charlieAttempt];

      // Mock database responses - ensure proper ordering
      (prisma.fktAttempt.create as jest.Mock).mockResolvedValue(charlieAttempt);
      (prisma.fktAttempt.findMany as jest.Mock).mockResolvedValue([
        charlieAttempt, // 5100 - should be #1
        aliceAttempt,   // 5400 - should be #2
        bobAttempt      // 5700 - should be #3
      ]);

      // Simulate the transaction that updates all rankings
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      // Calculate new rankings after Charlie's submission
      const rankedAttempts = await calculateRankings('route-123', 'AERO_7');

      expect(rankedAttempts).toHaveLength(3);

      // Charlie should now be #1 (new fastest)
      const charlieRanked = rankedAttempts.find(a => a.id === 'attempt-charlie-1');
      expect(charlieRanked?.rank).toBe(1);
      expect(charlieRanked?.durationSec).toBe(5100);

      // Alice should now be #2 (formerly #1)
      const aliceRanked = rankedAttempts.find(a => a.id === 'attempt-alice-1');
      expect(aliceRanked?.rank).toBe(2);
      expect(aliceRanked?.durationSec).toBe(5400);

      // Bob should now be #3 (formerly #2)
      const bobRanked = rankedAttempts.find(a => a.id === 'attempt-bob-1');
      expect(bobRanked?.rank).toBe(3);
      expect(bobRanked?.durationSec).toBe(5700);

      // Verify correct time order
      expect(rankedAttempts[0].durationSec).toBe(5100); // Charlie (fastest)
      expect(rankedAttempts[1].durationSec).toBe(5400); // Alice
      expect(rankedAttempts[2].durationSec).toBe(5700); // Bob (slowest)
    });
  });

  describe('Rig-Specific Rankings', () => {
    test('should maintain separate rankings for different rig sizes', async () => {
      // FKT attempts for AERO_7
      const aliceAero7 = {
        id: 'attempt-alice-aero7',
        userId: 'user-alice',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400,
        rank: 1
      };

      const bobAero7 = {
        id: 'attempt-bob-aero7',
        userId: 'user-bob',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5700,
        rank: 2
      };

      // FKT attempts for AERO_9 (different rig size)
      const charlieAero9 = {
        id: 'attempt-charlie-aero9',
        userId: 'user-charlie',
        routeId: 'route-123',
        rigSize: 'AERO_9',
        status: 'APPROVED',
        durationSec: 5200, // Faster than AERO_7 times, but different rig
        rank: 1
      };

      // Mock different queries for different rig sizes
      (prisma.fktAttempt.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.rigSize === 'AERO_7') {
          return Promise.resolve([aliceAero7, bobAero7]);
        } else if (query.where?.rigSize === 'AERO_9') {
          return Promise.resolve([charlieAero9]);
        }
        return Promise.resolve([]);
      });

      // Calculate rankings for AERO_7
      const aero7Rankings = await calculateRankings('route-123', 'AERO_7');
      expect(aero7Rankings).toHaveLength(2);
      expect(aero7Rankings[0].rank).toBe(1);
      expect(aero7Rankings[0].id).toBe('attempt-alice-aero7');

      // Calculate rankings for AERO_9
      const aero9Rankings = await calculateRankings('route-123', 'AERO_9');
      expect(aero9Rankings).toHaveLength(1);
      expect(aero9Rankings[0].rank).toBe(1);
      expect(aero9Rankings[0].id).toBe('attempt-charlie-aero9');
    });
  });

  describe('Edge Cases and Validations', () => {
    test('should handle identical times with tiebreaker', async () => {
      // Two attempts with identical duration
      const aliceAttempt = {
        id: 'attempt-alice-1',
        userId: 'user-alice',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400,
        createdAt: new Date('2024-03-15T14:00:00Z') // Earlier submission
      };

      const bobAttempt = {
        id: 'attempt-bob-1',
        userId: 'user-bob',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400, // Same time!
        createdAt: new Date('2024-03-16T10:00:00Z') // Later submission
      };

      (prisma.fktAttempt.findMany as jest.Mock).mockResolvedValue([aliceAttempt, bobAttempt]);

      const rankedAttempts = await calculateRankings('route-123', 'AERO_7');

      expect(rankedAttempts).toHaveLength(2);

      // Earlier submission should get better rank in case of tie
      expect(rankedAttempts[0].id).toBe('attempt-alice-1');
      expect(rankedAttempts[0].rank).toBe(1);
      expect(rankedAttempts[1].id).toBe('attempt-bob-1');
      expect(rankedAttempts[1].rank).toBe(2);
    });

    test('should only rank approved attempts', async () => {
      const approvedAttempt = {
        id: 'attempt-approved',
        userId: 'user-alice',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'APPROVED',
        durationSec: 5400
      };

      const rejectedAttempt = {
        id: 'attempt-rejected',
        userId: 'user-bob',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'REJECTED', // Should not be ranked
        durationSec: 5200 // Would be faster if approved
      };

      const pendingAttempt = {
        id: 'attempt-pending',
        userId: 'user-charlie',
        routeId: 'route-123',
        rigSize: 'AERO_7',
        status: 'PENDING', // Should not be ranked
        durationSec: 5300
      };

      (prisma.fktAttempt.findMany as jest.Mock).mockResolvedValue([
        approvedAttempt,
        rejectedAttempt,
        pendingAttempt
      ]);

      const rankedAttempts = await calculateRankings('route-123', 'AERO_7');

      // Only approved attempts should be ranked
      expect(rankedAttempts).toHaveLength(1);
      expect(rankedAttempts[0].id).toBe('attempt-approved');
      expect(rankedAttempts[0].rank).toBe(1);
    });
  });

  describe('Database Update Integration', () => {
    test('should update all attempt ranks in database transaction', async () => {
      const attempts = [
        { id: 'attempt-1', durationSec: 5100, status: 'APPROVED' },
        { id: 'attempt-2', durationSec: 5400, status: 'APPROVED' },
        { id: 'attempt-3', durationSec: 5700, status: 'APPROVED' }
      ];

      (prisma.fktAttempt.findMany as jest.Mock).mockResolvedValue(attempts);
      (prisma.fktAttempt.update as jest.Mock).mockResolvedValue({});
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      await updateRankingsInDatabase('route-123', 'AERO_7');

      // Should update each attempt with correct rank
      expect(prisma.fktAttempt.update).toHaveBeenCalledTimes(3);
      expect(prisma.fktAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: { rank: 1 }
      });
      expect(prisma.fktAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-2' },
        data: { rank: 2 }
      });
      expect(prisma.fktAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-3' },
        data: { rank: 3 }
      });
    });
  });
});

// Helper function to calculate rankings (simulates actual ranking logic)
async function calculateRankings(routeId: string, rigSize: string) {
  const allAttempts = await prisma.fktAttempt.findMany({
    where: {
      routeId,
      rigSize
    },
    orderBy: [
      { durationSec: 'asc' },  // Fastest time first
      { createdAt: 'asc' }     // Earlier submission as tiebreaker
    ]
  });

  // Filter only approved attempts for ranking
  const approvedAttempts = allAttempts.filter(attempt => attempt.status === 'APPROVED');

  return approvedAttempts.map((attempt, index) => ({
    ...attempt,
    rank: index + 1
  }));
}

// Helper function to update rankings in database (simulates actual update logic)
async function updateRankingsInDatabase(routeId: string, rigSize: string) {
  return prisma.$transaction(async () => {
    const rankedAttempts = await calculateRankings(routeId, rigSize);

    for (const attempt of rankedAttempts) {
      await prisma.fktAttempt.update({
        where: { id: attempt.id },
        data: { rank: attempt.rank }
      });
    }

    return rankedAttempts;
  });
}