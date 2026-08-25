import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

import {
  Search,
  Filter,
  Download,
  Users,
  Calendar,
  Clock,
  Dumbbell,
  Activity,
  Trophy,
  Flame,
  Sparkles,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  UserCheck,
  Zap,
  X,
} from "lucide-react";

/**
 * ============================================================
 * GYM ALLOCATION RESULTS
 * ============================================================
 *
 * Updated Gym Slot Schedule - August 2026
 *
 * Slot 1  → 4:30 AM  - 5:30 AM
 * Slot 2  → 5:30 AM  - 7:00 AM
 * Slot 3  → 7:00 AM  - 8:30 AM
 * Slot 4  → 2:30 PM  - 4:00 PM
 * Slot 5  → 4:00 PM  - 5:30 PM
 * Slot 6  → 5:30 PM  - 7:00 PM
 * Slot 7  → 7:00 PM  - 8:30 PM
 * Slot 8  → 8:30 PM  - 10:00 PM
 * Slot 9  → 10:00 PM - 11:30 PM
 *
 * Slot 7:
 * 20 available
 * 15 reserved for Powerlifting Students
 *
 * ============================================================
 */

export default function GymAllocationResults({
  csvPath = "/data/results-new.csv",
}) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // ============================================================
  // UPDATED SLOT INFORMATION
  // ============================================================

  const slotInfo = [
    {
      num: 1,
      time: "4:30 AM - 5:30 AM",
      shortTime: "4:30 – 5:30 AM",
      color: "yellow",
      icon: "🌅",
    },
    {
      num: 2,
      time: "5:30 AM - 7:00 AM",
      shortTime: "5:30 – 7:00 AM",
      color: "cyan",
      icon: "☀️",
    },
    {
      num: 3,
      time: "7:00 AM - 8:30 AM",
      shortTime: "7:00 – 8:30 AM",
      color: "green",
      icon: "💪",
    },
    {
      num: 4,
      time: "2:30 PM - 4:00 PM",
      shortTime: "2:30 – 4:00 PM",
      color: "red",
      icon: "🏃",
    },
    {
      num: 5,
      time: "4:00 PM - 5:30 PM",
      shortTime: "4:00 – 5:30 PM",
      color: "purple",
      icon: "🔥",
    },
    {
      num: 6,
      time: "5:30 PM - 7:00 PM",
      shortTime: "5:30 – 7:00 PM",
      color: "amber",
      icon: "⚡",
    },
    {
      num: 7,
      time: "7:00 PM - 8:30 PM",
      shortTime: "7:00 – 8:30 PM",
      color: "pink",
      icon: "🏆",
      available: 20,
      reserved: "15 Powerlifting Students",
    },
    {
      num: 8,
      time: "8:30 PM - 10:00 PM",
      shortTime: "8:30 – 10:00 PM",
      color: "sky",
      icon: "🌙",
    },
    {
      num: 9,
      time: "10:00 PM - 11:30 PM",
      shortTime: "10:00 – 11:30 PM",
      color: "indigo",
      icon: "🌃",
    },
  ];

  // ============================================================
  // LOAD CSV
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(csvPath)
      .then((r) => {
        if (!r.ok) {
          throw new Error(
            `Failed to fetch CSV (status ${r.status})`
          );
        }

        return r.text();
      })

      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          trimHeaders: true,
        });

        if (parsed.errors && parsed.errors.length > 0) {
          console.warn(
            "CSV parsing warnings:",
            parsed.errors
          );
        }

        const rows = parsed.data
          .map((r) => {
            const findKey = (rowObj, candidates = []) => {
              const norm = (s) =>
                String(s || "")
                  .replace(/\s+/g, "")
                  .toLowerCase();

              const keys = Object.keys(rowObj);

              // Exact match
              for (const cand of candidates) {
                for (const k of keys) {
                  if (norm(k) === norm(cand)) {
                    return k;
                  }
                }
              }

              // Partial match
              for (const k of keys) {
                const nk = norm(k);

                for (const cand of candidates) {
                  const cleanCandidate = norm(cand).replace(
                    /[^a-z0-9]/g,
                    ""
                  );

                  if (nk.includes(cleanCandidate)) {
                    return k;
                  }
                }
              }

              return null;
            };

            const nameKey = findKey(r, [
              "FullName",
              "Full Name",
              "Name",
              "FULLNAME",
            ]);

            const rollKey = findKey(r, [
              "RollNumber",
              "Roll Number",
              "Roll",
              "ROLLNUMBER",
              "ROLL",
            ]);

            const emailKey = findKey(r, [
              "Email",
              "E-mail",
              "EMAIL",
            ]);

            const durationKey = findKey(r, [
              "Duration",
              "DURATION",
            ]);

            const slotKey = findKey(r, [
              "Allocated Slot",
              "AllocatedSlot",
              "Allocated",
              "Slot",
              "SLOT",
              "Allocated Slot ",
            ]);

            const safe = (key) => {
              if (!key) return "";

              const val = r[key];

              return val == null
                ? ""
                : String(val).trim();
            };

            return {
              name: safe(nameKey),
              roll: safe(rollKey),
              email: safe(emailKey),
              duration: safe(durationKey),
              slot: safe(slotKey),
            };
          })

          .filter(
            (s) =>
              s.name ||
              s.roll ||
              s.email
          );

        if (!cancelled) {
          setStudents(rows);
          setLoading(false);
        }
      })

      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [csvPath]);

  // ============================================================
  // SLOT NUMBER EXTRACTOR
  // ============================================================

  const getSlotNumber = (slot) => {
    const value = String(slot || "");

    const match =
      value.match(/SLOT\s*([0-9]{1,2})/i) ||
      value.match(/\b([0-9]{1,2})\b/);

    return match
      ? parseInt(match[1], 10)
      : null;
  };

  // ============================================================
  // SLOT COUNTS
  // ============================================================

  const slotCounts = useMemo(() => {
    const counts = {};

    students.forEach((student) => {
      const slotNumber = getSlotNumber(student.slot);

      if (slotNumber) {
        counts[slotNumber] =
          (counts[slotNumber] || 0) + 1;
      }
    });

    return counts;
  }, [students]);

  // ============================================================
  // DURATION COUNTS
  // ============================================================

  const durationCounts = useMemo(() => {
    const counts = {};

    students.forEach((student) => {
      const duration =
        student.duration || "Unknown";

      counts[duration] =
        (counts[duration] || 0) + 1;
    });

    return counts;
  }, [students]);

  const durationOptions = Object.keys(
    durationCounts
  );

  // ============================================================
  // TOTAL ACTIVE SLOTS
  // ============================================================

  const activeSlots = useMemo(() => {
    return Object.keys(slotCounts).length;
  }, [slotCounts]);

  // ============================================================
  // MOST POPULAR SLOT
  // ============================================================

  const mostPopularSlot = useMemo(() => {
    let bestSlot = null;
    let highestCount = 0;

    Object.entries(slotCounts).forEach(
      ([slot, count]) => {
        if (count > highestCount) {
          highestCount = count;
          bestSlot = slot;
        }
      }
    );

    return {
      slot: bestSlot,
      count: highestCount,
    };
  }, [slotCounts]);

  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  const sortedAndFiltered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    let result = students.filter(
      (student) => {
        const matchesSearch =
          !q ||
          (student.name || "")
            .toLowerCase()
            .includes(q) ||
          (student.roll || "")
            .toLowerCase()
            .includes(q) ||
          (student.email || "")
            .toLowerCase()
            .includes(q);

        const matchesSlot =
          !slotFilter ||
          getSlotNumber(student.slot) ===
            Number(
              slotFilter.replace("SLOT ", "")
            );

        const matchesDuration =
          !durationFilter ||
          (student.duration || "") ===
            durationFilter;

        return (
          matchesSearch &&
          matchesSlot &&
          matchesDuration
        );
      }
    );

    result.sort((a, b) => {
      let aVal = a[sortBy] || "";
      let bVal = b[sortBy] || "";

      if (sortBy === "slot") {
        aVal =
          getSlotNumber(aVal) ?? 999;

        bVal =
          getSlotNumber(bVal) ?? 999;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) {
        return sortOrder === "asc"
          ? -1
          : 1;
      }

      if (aVal > bVal) {
        return sortOrder === "asc"
          ? 1
          : -1;
      }

      return 0;
    });

    return result;
  }, [
    students,
    search,
    slotFilter,
    durationFilter,
    sortBy,
    sortOrder,
  ]);

  // ============================================================
  // SORT
  // ============================================================

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((order) =>
        order === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // ============================================================
  // DOWNLOAD CSV
  // ============================================================

  const downloadCSV = () => {
    const csv =
      Papa.unparse(
        sortedAndFiltered
      );

    const blob = new Blob(
      [csv],
      {
        type: "text/csv",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `gym-allocation-${new Date()
        .toISOString()
        .split("T")[0]}.csv`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("");
    setSlotFilter("");
    setDurationFilter("");
  };

  const hasFilters =
    search ||
    slotFilter ||
    durationFilter;

  // ============================================================
  // SLOT BADGE COLORS
  // ============================================================

  function slotBadgeClass(slot) {
    const number =
      getSlotNumber(slot);

    const classes = {
      1:
        "bg-yellow-50 text-yellow-700 border-yellow-300",
      2:
        "bg-cyan-50 text-cyan-700 border-cyan-300",
      3:
        "bg-green-50 text-green-700 border-green-300",
      4:
        "bg-red-50 text-red-700 border-red-300",
      5:
        "bg-purple-50 text-purple-700 border-purple-300",
      6:
        "bg-amber-50 text-amber-700 border-amber-300",
      7:
        "bg-pink-50 text-pink-700 border-pink-300",
      8:
        "bg-sky-50 text-sky-700 border-sky-300",
      9:
        "bg-indigo-50 text-indigo-700 border-indigo-300",
    };

    return (
      classes[number] ||
      "bg-gray-100 text-gray-700 border-gray-300"
    );
  }

  // ============================================================
  // SLOT CARD COLOR
  // ============================================================

  function slotCardClass(color) {
    const colors = {
      yellow:
        "from-yellow-50 to-orange-50 border-yellow-200 hover:border-yellow-400",
      cyan:
        "from-cyan-50 to-blue-50 border-cyan-200 hover:border-cyan-400",
      green:
        "from-green-50 to-emerald-50 border-green-200 hover:border-green-400",
      red:
        "from-red-50 to-orange-50 border-red-200 hover:border-red-400",
      purple:
        "from-purple-50 to-fuchsia-50 border-purple-200 hover:border-purple-400",
      amber:
        "from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-400",
      pink:
        "from-pink-50 to-rose-50 border-pink-200 hover:border-pink-400",
      sky:
        "from-sky-50 to-blue-50 border-sky-200 hover:border-sky-400",
      indigo:
        "from-indigo-50 to-violet-50 border-indigo-200 hover:border-indigo-400",
    };

    return (
      colors[color] ||
      "from-gray-50 to-white border-gray-200"
    );
  }

  // ============================================================
  // SORT ICON
  // ============================================================

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return (
        <span className="ml-1 opacity-50">
          ↕
        </span>
      );
    }

    return sortOrder === "asc" ? (
      <ChevronUp className="inline w-4 h-4" />
    ) : (
      <ChevronDown className="inline w-4 h-4" />
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-3 md:p-6 lg:p-8 relative overflow-hidden">

      {/* ======================================================
          DECORATIVE BACKGROUND
      ====================================================== */}

      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{
          animationDelay: "1.5s",
        }}
      />

      <div
        className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"
        style={{
          animationDelay: "2s",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* ====================================================
            MAIN CARD
        ==================================================== */}

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/30">

          {/* ==================================================
              HERO HEADER
          ================================================== */}

          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white">

            {/* Decorative circles */}

            <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-white/10 blur-sm" />

            <div className="absolute right-24 bottom-[-100px] w-56 h-56 rounded-full bg-white/10" />

            <div className="absolute left-1/2 top-5 opacity-10">
              <Dumbbell
                size={170}
                strokeWidth={1}
              />
            </div>

            <div className="relative px-6 md:px-10 py-8 md:py-10">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                {/* Title */}

                <div>

                  <div className="flex items-center gap-3 mb-3">

                    <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg">

                      <Dumbbell
                        size={32}
                        className="animate-pulse"
                      />

                    </div>

                    <div className="flex items-center gap-2">

                      <Sparkles
                        size={18}
                        className="text-yellow-300"
                      />

                      <span className="text-sm font-semibold uppercase tracking-widest text-white/80">
                        Fitness Management
                      </span>

                    </div>

                  </div>

                  <h1 className="text-3xl md:text-5xl font-black tracking-tight">

                    GYM Slot Allocation

                  </h1>

                  <p className="mt-3 text-white/80 flex items-center gap-2">

                    <Calendar size={17} />

                    August 2026 • Updated Slot Schedule

                  </p>

                </div>

                {/* Hero Stats */}

                <div className="flex items-center gap-3">

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 min-w-[120px]">

                    <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase">

                      <Activity size={14} />

                      Students

                    </div>

                    <div className="text-3xl font-black mt-1">

                      {students.length}

                    </div>

                  </div>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 min-w-[120px]">

                    <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase">

                      <Clock size={14} />

                      Slots

                    </div>

                    <div className="text-3xl font-black mt-1">

                      9

                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* ==================================================
              QUICK STATISTICS
          ================================================== */}

          <div className="p-5 md:p-7 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* Total */}

              <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

                <div className="absolute -right-5 -bottom-5 opacity-10">

                  <Users size={90} />

                </div>

                <div className="relative">

                  <div className="flex items-center gap-2 text-white/80 text-sm font-medium">

                    <Users size={17} />

                    Total Students

                  </div>

                  <div className="text-3xl md:text-4xl font-black mt-2">

                    {students.length}

                  </div>

                </div>

              </div>

              {/* Active Slots */}

              <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

                <div className="absolute -right-5 -bottom-5 opacity-5">

                  <Zap size={90} />

                </div>

                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">

                  <Zap size={17} />

                  Active Slots

                </div>

                <div className="text-3xl md:text-4xl font-black text-slate-800 mt-2">

                  {activeSlots}

                  <span className="text-base text-slate-400 font-semibold">
                    {" "}
                    / 9
                  </span>

                </div>

              </div>

              {/* Popular */}

              <div className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">

                  <Trophy size={17} />

                  Popular Slot

                </div>

                <div className="text-3xl md:text-4xl font-black text-slate-800 mt-2">

                  {mostPopularSlot.slot
                    ? `#${mostPopularSlot.slot}`
                    : "--"}

                </div>

                <div className="text-xs text-slate-400 mt-1">

                  {mostPopularSlot.count} students

                </div>

              </div>

              {/* Powerlifting */}

              <div className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

                <div className="absolute -right-5 -bottom-5 opacity-10">

                  <Dumbbell size={90} />

                </div>

                <div className="relative">

                  <div className="flex items-center gap-2 text-white/80 text-sm font-medium">

                    <Flame size={17} />

                    Slot 7 Reserved

                  </div>

                  <div className="text-3xl md:text-4xl font-black mt-2">

                    15

                  </div>

                  <div className="text-xs text-white/70 mt-1">

                    Powerlifting Students

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* ==================================================
              SLOT SCHEDULE
          ================================================== */}

          <div className="px-5 md:px-7 pt-7">

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">

              <div>

                <div className="flex items-center gap-2">

                  <Clock
                    className="text-indigo-600"
                    size={22}
                  />

                  <h2 className="text-xl md:text-2xl font-black text-slate-800">

                    Gym Slot Schedule

                  </h2>

                </div>

                <p className="text-sm text-slate-500 mt-1">

                  Updated timings for all 9 gym sessions

                </p>

              </div>

              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-full">

                9 Sessions Available

              </div>

            </div>

            {/* Slot Cards */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {slotInfo.map(
                ({
                  num,
                  time,
                  shortTime,
                  color,
                  icon,
                  available,
                  reserved,
                }) => (
                  <div
                    key={num}
                    className={`
                      relative overflow-hidden
                      bg-gradient-to-br
                      ${slotCardClass(color)}
                      border rounded-2xl
                      p-4
                      transition-all duration-300
                      hover:-translate-y-1
                      hover:shadow-lg
                      cursor-pointer
                    `}
                  >

                    {/* Glow */}

                    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/60 blur-xl" />

                    <div className="relative flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="w-11 h-11 rounded-xl bg-white/80 shadow-sm flex items-center justify-center text-xl">

                          {icon}

                        </div>

                        <div>

                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">

                            Slot {num}

                          </div>

                          <div className="font-black text-slate-800 text-base">

                            {shortTime}

                          </div>

                        </div>

                      </div>

                      <div className="text-xs font-black bg-white/80 rounded-full px-2.5 py-1 text-slate-600">

                        #{num}

                      </div>

                    </div>

                    {available && (
                      <div className="relative mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-xs">

                        <span className="font-semibold text-slate-600">

                          Available:{" "}

                          <strong>
                            {available}
                          </strong>

                        </span>

                        <span className="text-pink-600 font-bold">

                          Powerlifting

                        </span>

                      </div>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

          {/* ==================================================
              FILTER AREA
          ================================================== */}

          <div className="p-5 md:p-7 mt-2">

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5">

              <div className="flex flex-col lg:flex-row gap-3">

                {/* Search */}

                <div className="flex-1 relative">

                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={19}
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className="
                      w-full
                      pl-11 pr-4 py-3.5
                      rounded-xl
                      border border-slate-200
                      bg-white
                      text-slate-800
                      placeholder:text-slate-400
                      focus:border-indigo-500
                      focus:ring-4
                      focus:ring-indigo-500/10
                      focus:outline-none
                      transition-all
                    "
                    placeholder="Search name, roll number, or email..."
                  />

                </div>

                {/* Slot Filter */}

                <div className="relative">

                  <Filter
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />

                  <select
                    value={slotFilter}
                    onChange={(e) =>
                      setSlotFilter(
                        e.target.value
                      )
                    }
                    className="
                      w-full lg:w-60
                      pl-11 pr-8 py-3.5
                      rounded-xl
                      border border-slate-200
                      bg-white
                      text-slate-700
                      focus:border-indigo-500
                      focus:ring-4
                      focus:ring-indigo-500/10
                      focus:outline-none
                      cursor-pointer
                    "
                  >

                    <option value="">
                      All Slots
                    </option>

                    {slotInfo.map(
                      ({
                        num,
                        time,
                      }) => (
                        <option
                          key={num}
                          value={`SLOT ${num}`}
                        >
                          Slot {num} • {time}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* Duration */}

                {durationOptions.length >
                  0 && (
                  <select
                    value={durationFilter}
                    onChange={(e) =>
                      setDurationFilter(
                        e.target.value
                      )
                    }
                    className="
                      w-full lg:w-52
                      px-4 py-3.5
                      rounded-xl
                      border border-slate-200
                      bg-white
                      text-slate-700
                      focus:border-indigo-500
                      focus:ring-4
                      focus:ring-indigo-500/10
                      focus:outline-none
                      cursor-pointer
                    "
                  >

                    <option value="">
                      All Durations
                    </option>

                    {durationOptions.map(
                      (duration) => (
                        <option
                          key={duration}
                          value={duration}
                        >
                          {duration}
                        </option>
                      )
                    )}

                  </select>
                )}

                {/* Clear */}

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="
                      flex items-center
                      justify-center gap-2
                      px-5 py-3.5
                      rounded-xl
                      bg-slate-200
                      hover:bg-slate-300
                      text-slate-700
                      font-semibold
                      transition-all
                    "
                  >

                    <X size={17} />

                    Clear

                  </button>
                )}

                {/* Download */}

                <button
                  onClick={downloadCSV}
                  disabled={
                    sortedAndFiltered.length ===
                    0
                  }
                  className="
                    flex items-center
                    justify-center gap-2
                    px-5 py-3.5
                    rounded-xl
                    bg-gradient-to-r
                    from-indigo-600
                    to-purple-600
                    hover:from-indigo-700
                    hover:to-purple-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    font-bold
                    shadow-lg
                    hover:shadow-xl
                    transition-all
                    hover:-translate-y-0.5
                  "
                >

                  <Download size={18} />

                  Export CSV

                </button>

              </div>

              {/* Result Count */}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">

                <div className="text-sm text-slate-500">

                  Showing{" "}

                  <span className="font-black text-indigo-600">

                    {sortedAndFiltered.length}

                  </span>{" "}

                  of{" "}

                  <span className="font-semibold text-slate-700">

                    {students.length}

                  </span>{" "}

                  students

                </div>

                {hasFilters && (
                  <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">

                    Filters active

                  </div>
                )}

              </div>

            </div>

          </div>

          {/* ==================================================
              TABLE
          ================================================== */}

          <div className="overflow-x-auto">

            {loading ? (

              <div className="text-center py-24">

                <div className="relative inline-flex">

                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />

                  <Dumbbell
                    className="absolute inset-0 m-auto text-indigo-600"
                    size={25}
                  />

                </div>

                <p className="mt-5 text-slate-600 font-semibold">

                  Loading gym allocation data...

                </p>

                <p className="text-xs text-slate-400 mt-1">

                  Preparing your dashboard

                </p>

              </div>

            ) : error ? (

              <div className="text-center py-24 px-6">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center text-3xl">

                  ⚠️

                </div>

                <p className="text-red-600 font-bold text-lg mt-4">

                  Error loading data

                </p>

                <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">

                  {error}

                </p>

                <button
                  onClick={() =>
                    window.location.reload()
                  }
                  className="
                    mt-5
                    inline-flex
                    items-center gap-2
                    px-5 py-2.5
                    rounded-xl
                    bg-red-600
                    hover:bg-red-700
                    text-white
                    font-semibold
                  "
                >

                  <RefreshCw size={16} />

                  Try Again

                </button>

              </div>

            ) : sortedAndFiltered.length ===
              0 ? (

              <div className="text-center py-24 px-6">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">

                  <Search
                    size={28}
                    className="text-slate-400"
                  />

                </div>

                <p className="text-slate-700 font-bold text-lg mt-4">

                  No students found

                </p>

                <p className="text-slate-400 text-sm mt-2">

                  Try adjusting your search or filters.

                </p>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="
                      mt-5
                      px-5 py-2.5
                      rounded-xl
                      bg-indigo-600
                      hover:bg-indigo-700
                      text-white
                      font-semibold
                    "
                  >
                    Clear Filters
                  </button>
                )}

              </div>

            ) : (

              <table className="min-w-full">

                {/* TABLE HEADER */}

                <thead className="
                  bg-gradient-to-r
                  from-slate-900
                  via-indigo-900
                  to-purple-900
                  text-white
                ">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs uppercase tracking-wider font-bold">

                      #

                    </th>

                    <th
                      onClick={() =>
                        handleSort("name")
                      }
                      className="
                        px-5 py-4
                        text-left
                        text-xs
                        uppercase
                        tracking-wider
                        font-bold
                        cursor-pointer
                        hover:bg-white/10
                        transition-colors
                        whitespace-nowrap
                      "
                    >

                      Name{" "}

                      <SortIcon column="name" />

                    </th>

                    <th
                      onClick={() =>
                        handleSort("roll")
                      }
                      className="
                        px-5 py-4
                        text-left
                        text-xs
                        uppercase
                        tracking-wider
                        font-bold
                        cursor-pointer
                        hover:bg-white/10
                        transition-colors
                        whitespace-nowrap
                      "
                    >

                      Roll Number{" "}

                      <SortIcon column="roll" />

                    </th>

                    <th className="
                      px-5 py-4
                      text-left
                      text-xs
                      uppercase
                      tracking-wider
                      font-bold
                    ">

                      Email

                    </th>

                    <th
                      onClick={() =>
                        handleSort("slot")
                      }
                      className="
                        px-5 py-4
                        text-left
                        text-xs
                        uppercase
                        tracking-wider
                        font-bold
                        cursor-pointer
                        hover:bg-white/10
                        transition-colors
                        whitespace-nowrap
                      "
                    >

                      Gym Slot{" "}

                      <SortIcon column="slot" />

                    </th>

                    <th className="
                      px-5 py-4
                      text-left
                      text-xs
                      uppercase
                      tracking-wider
                      font-bold
                    ">

                      Duration

                    </th>

                  </tr>

                </thead>

                {/* TABLE BODY */}

                <tbody className="bg-white divide-y divide-slate-100">

                  {sortedAndFiltered.map(
                    (student, idx) => {

                      const slotNumber =
                        getSlotNumber(
                          student.slot
                        );

                      const slot =
                        slotInfo.find(
                          (item) =>
                            item.num ===
                            slotNumber
                        );

                      return (
                        <tr
                          key={`${
                            student.roll ||
                            idx
                          }-${idx}`}
                          className="
                            group
                            hover:bg-gradient-to-r
                            hover:from-indigo-50
                            hover:to-purple-50
                            transition-all
                            duration-200
                          "
                        >

                          {/* Number */}

                          <td className="px-5 py-4">

                            <div className="
                              w-8 h-8
                              rounded-lg
                              bg-slate-100
                              group-hover:bg-indigo-100
                              flex items-center
                              justify-center
                              text-xs
                              font-bold
                              text-slate-500
                              group-hover:text-indigo-600
                              transition-colors
                            ">

                              {idx + 1}

                            </div>

                          </td>

                          {/* Name */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="
                                w-9 h-9
                                rounded-xl
                                bg-gradient-to-br
                                from-indigo-500
                                to-purple-600
                                text-white
                                flex items-center
                                justify-center
                                text-sm
                                font-black
                                shadow-sm
                              ">

                                {(
                                  student.name ||
                                  "?"
                                )
                                  .charAt(0)
                                  .toUpperCase()}

                              </div>

                              <div>

                                <div className="font-bold text-slate-800">

                                  {student.name ||
                                    "Unnamed"}

                                </div>

                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">

                                  <UserCheck
                                    size={11}
                                  />

                                  Gym Member

                                </div>

                              </div>

                            </div>

                          </td>

                          {/* Roll */}

                          <td className="px-5 py-4">

                            <span className="
                              inline-flex
                              px-2.5 py-1
                              rounded-lg
                              bg-slate-100
                              text-slate-700
                              font-mono
                              text-xs
                              font-semibold
                            ">

                              {student.roll ||
                                "—"}

                            </span>

                          </td>

                          {/* Email */}

                          <td className="px-5 py-4">

                            <div className="
                              text-sm
                              text-slate-600
                              max-w-[260px]
                              truncate
                            ">

                              {student.email ||
                                "—"}

                            </div>

                          </td>

                          {/* Slot */}

                          <td className="px-5 py-4">

                            <div className="flex flex-col items-start gap-1.5">

                              <span
                                className={`
                                  inline-flex
                                  items-center
                                  gap-1.5
                                  px-3
                                  py-1.5
                                  rounded-full
                                  border
                                  text-xs
                                  font-black
                                  ${slotBadgeClass(
                                    student.slot
                                  )}
                                `}
                              >

                                <Dumbbell
                                  size={13}
                                />

                                {student.slot ||
                                  "Unassigned"}

                              </span>

                              {slot && (
                                <span className="text-[11px] text-slate-400 font-medium ml-1">

                                  {slot.shortTime}

                                </span>
                              )}

                            </div>

                          </td>

                          {/* Duration */}

                          <td className="px-5 py-4">

                            <span className="
                              inline-flex
                              items-center
                              gap-1.5
                              text-xs
                              font-semibold
                              text-slate-600
                              bg-slate-50
                              border
                              border-slate-200
                              rounded-lg
                              px-2.5
                              py-1.5
                            ">

                              <Calendar
                                size={12}
                              />

                              {student.duration ||
                                "—"}

                            </span>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>
            )}

          </div>

          {/* ==================================================
              BOTTOM INFORMATION
          ================================================== */}

          <div className="border-t border-slate-200 bg-slate-50 px-5 md:px-7 py-5">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">

                  <Dumbbell size={19} />

                </div>

                <div>

                  <div className="text-xs text-slate-400 font-semibold uppercase">

                    Gym Sessions

                  </div>

                  <div className="text-sm font-bold text-slate-700">

                    9 Daily Slots

                  </div>

                </div>

              </div>

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">

                  <Trophy size={19} />

                </div>

                <div>

                  <div className="text-xs text-slate-400 font-semibold uppercase">

                    Special Reservation

                  </div>

                  <div className="text-sm font-bold text-slate-700">

                    Slot 7 • Powerlifting

                  </div>

                </div>

              </div>

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">

                  <Activity size={19} />

                </div>

                <div>

                  <div className="text-xs text-slate-400 font-semibold uppercase">

                    Status

                  </div>

                  <div className="text-sm font-bold text-green-600">

                    Allocation Active

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="
          mt-5
          rounded-2xl
          bg-white/10
          backdrop-blur-md
          border
          border-white/10
          px-5
          py-4
          text-center
        ">

          <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-xs text-white/50">

            <span>
              GYM Allocation Dashboard
            </span>

            <span className="hidden md:inline">
              •
            </span>

            <span>
              9-Slot Schedule • August 2026
            </span>

            <span className="hidden md:inline">
              •
            </span>

            <span className="font-mono text-white/40">
              {csvPath}
            </span>

          </div>

        </footer>

      </div>
    </div>
  );
}
