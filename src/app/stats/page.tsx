import { prisma } from "@/lib/prisma";
import { COUNTRY_NAMES, getRegion, REGION_LABELS } from "@/lib/regions";
import { PageHeader } from "@/components/PageHeader";

async function getStats() {
  // First get all unique sailors (both registered and unregistered)
  const [registeredUsers, allAttempts] = await Promise.all([
    prisma.user.findMany({ select: { email: true, name: true } }),
    prisma.fktAttempt.findMany({
      where: { status: "APPROVED" },
      select: { sailorName: true, sailorEmail: true, athlete: { select: { email: true } } }
    })
  ]);

  // Count unique sailors
  const uniqueSailorEmails = new Set();
  const uniqueSailorNames = new Set();

  // Add registered users
  registeredUsers.forEach(user => {
    if (user.email) uniqueSailorEmails.add(user.email);
    if (user.name) uniqueSailorNames.add(user.name);
  });

  // Add unregistered sailors from attempts
  allAttempts.forEach(attempt => {
    if (attempt.sailorEmail && !uniqueSailorEmails.has(attempt.sailorEmail)) {
      uniqueSailorEmails.add(attempt.sailorEmail);
      if (attempt.sailorName) uniqueSailorNames.add(attempt.sailorName);
    } else if (attempt.sailorName && !attempt.sailorEmail) {
      // Sailor name without email (completely unregistered)
      uniqueSailorNames.add(attempt.sailorName);
    }
  });

  const totalAthletes = Math.max(uniqueSailorEmails.size, uniqueSailorNames.size);

  const [
    totalCourses,
    totalApprovedCourses,
    totalAttempts,
    totalApprovedAttempts,
    recentCourses,
    popularCourses,
    coursesByCountry,
    athleteStats
  ] = await Promise.all([
    // Total courses
    prisma.course.count(),

    // Total approved courses
    prisma.course.count({ where: { status: "APPROVED" } }),

    // Total attempts
    prisma.fktAttempt.count(),

    // Total approved attempts
    prisma.fktAttempt.count({ where: { status: "APPROVED" } }),

    // Recent approved courses (last 10)
    prisma.course.findMany({
      where: { status: "APPROVED" },
      orderBy: { approvedAt: "desc" },
      take: 10,
      select: {
        name: true,
        country: true,
        approvedAt: true,
        submittedBy: { select: { name: true } }
      }
    }),

    // Most popular courses (by attempt count)
    prisma.course.findMany({
      where: { status: "APPROVED" },
      include: {
        _count: {
          select: { attempts: { where: { status: "APPROVED" } } }
        },
        submittedBy: { select: { name: true } }
      },
      orderBy: {
        attempts: { _count: "desc" }
      },
      take: 10
    }),


    // Courses by country
    prisma.course.groupBy({
      by: ["country"],
      where: { status: "APPROVED" },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } }
    }),

    // Top athletes by FKT count
    prisma.user.findMany({
      where: {
        attempts: {
          some: { status: "APPROVED" }
        }
      },
      include: {
        _count: {
          select: { attempts: { where: { status: "APPROVED" } } }
        }
      },
      orderBy: {
        attempts: { _count: "desc" }
      },
      take: 10
    })
  ]);

  return {
    totalCourses,
    totalApprovedCourses,
    totalAttempts,
    totalApprovedAttempts,
    totalAthletes,
    recentCourses,
    popularCourses,
    coursesByCountry,
    athleteStats
  };
}

export const metadata = {
  title: "Stats — RS Aero FKT",
  description: "Statistics and insights from the RS Aero FKT community"
};

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <>
      <PageHeader
        title="Statistics"
      />
      <div className="container mx-auto px-4 py-8">

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.totalApprovedCourses}</div>
          <div className="text-sm text-blue-600">Approved Courses</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.totalApprovedAttempts}</div>
          <div className="text-sm text-green-600">FKT Attempts</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{stats.totalAthletes}</div>
          <div className="text-sm text-purple-600">Athletes</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">{stats.totalCourses}</div>
          <div className="text-sm text-orange-600">Total Submitted</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-700">{stats.totalAttempts}</div>
          <div className="text-sm text-gray-600">Total Attempts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Popular Routes */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🏆 Most Popular Courses</h2>
          <div className="space-y-3">
            {stats.popularCourses.slice(0, 5).map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium">{course.name}</div>
                  <div className="text-xs text-muted-foreground">
                    by {course.submittedBy.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-700">
                    {course._count.attempts} attempts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Courses by Country */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🌍 Courses by Country</h2>
          <div className="space-y-3">
            {stats.coursesByCountry.slice(0, 8).map((item) => {
              const region = getRegion(item.country);
              return (
                <div key={item.country} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {COUNTRY_NAMES[item.country] || item.country}
                    </div>
                    {region && (
                      <div className="text-xs text-muted-foreground">
                        {REGION_LABELS[region]}
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-orange-700">
                    {item._count.country} courses
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Athletes */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">👑 Top Athletes</h2>
          <div className="space-y-3">
            {stats.athleteStats.slice(0, 8).map((athlete, index) => (
              <div key={athlete.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">
                    {index + 1}
                  </div>
                  <div className="font-medium">{athlete.name}</div>
                </div>
                <div className="font-semibold text-purple-700">
                  {athlete._count.attempts} FKTs
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📅 Recent Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.recentCourses.map((course) => (
              <div key={course.name} className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{course.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {COUNTRY_NAMES[course.country]} • by {course.submittedBy.name}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Approved {course.approvedAt?.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
