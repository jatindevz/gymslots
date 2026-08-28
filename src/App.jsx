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
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Save,
} from "lucide-react";

/**
 * ============================================================
 * CONFIGURATION & CONSTANTS
 * ============================================================
 */
const HARDCODED_ADMIN_KEY = "admin123"; // Change this to your desired admin key/password

export default function GymAllocationResults({
  csvPath = "/data/results-new.csv",
}) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");

  // Modal for Add / Edit
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null if adding new
  const [formData, setFormData] = useState({
    name: "",
    roll: "",
    email: "",
    slot: "SLOT 1",
  });

  const slotInfo = [
    { num: 1, time: "4:30 AM - 5:30 AM", shortTime: "4:30 – 5:30 AM", color: "yellow", icon: "🌅" },
    { num: 2, time: "5:30 AM - 7:00 AM", shortTime: "5:30 – 7:00 AM", color: "cyan", icon: "☀️" },
    { num: 3, time: "7:00 AM - 8:30 AM", shortTime: "7:00 – 8:30 AM", color: "green", icon: "💪" },
    { num: 4, time: "2:30 PM - 4:00 PM", shortTime: "2:30 – 4:00 PM", color: "red", icon: "🏃" },
    { num: 5, time: "4:00 PM - 5:30 PM", shortTime: "4:00 – 5:30 PM", color: "purple", icon: "🔥" },
    { num: 6, time: "5:30 PM - 7:00 PM", shortTime: "5:30 – 7:00 PM", color: "amber", icon: "⚡" },
    { num: 7, time: "7:00 PM - 8:30 PM", shortTime: "7:00 – 8:30 PM", color: "pink", icon: "🏆", available: 20, reserved: "15 Powerlifting Students" },
    { num: 8, time: "8:30 PM - 10:00 PM", shortTime: "8:30 – 10:00 PM", color: "sky", icon: "🌙" },
    { num: 9, time: "10:00 PM - 11:30 PM", shortTime: "10:00 – 11:30 PM", color: "indigo", icon: "🌃" },
  ];

  // ============================================================
  // LOAD DATA & LOCALSTORAGE SYNC
  // ============================================================

  useEffect(() => {
    const localData = localStorage.getItem("gym_allocation_data");
    if (localData) {
      try {
        setStudents(JSON.parse(localData));
        setLoading(false);
        return;
      } catch (e) {
        console.error("Local data parse error:", e);
      }
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(csvPath)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch CSV (status ${response.status})`);
        return response.text();
      })
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          trimHeaders: true,
        });

        const rows = parsed.data
          .map((row) => {
            const findKey = (rowObject, candidates = []) => {
              const normalize = (val) => String(val || "").replace(/\s+/g, "").toLowerCase();
              const keys = Object.keys(rowObject);
              for (const candidate of candidates) {
                for (const key of keys) {
                  if (normalize(key) === normalize(candidate)) return key;
                }
              }
              for (const key of keys) {
                const normalizedKey = normalize(key);
                for (const candidate of candidates) {
                  if (normalizedKey.includes(normalize(candidate).replace(/[^a-z0-9]/g, ""))) return key;
                }
              }
              return null;
            };

            const nameKey = findKey(row, ["FullName", "Full Name", "Name", "FULLNAME"]);
            const rollKey = findKey(row, ["RollNumber", "Roll Number", "Roll", "ROLLNUMBER", "ROLL"]);
            const emailKey = findKey(row, ["Email", "E-mail", "EMAIL"]);
            const slotKey = findKey(row, ["Allocated Slot", "AllocatedSlot", "Allocated", "Slot", "SLOT"]);

            const safe = (key) => (key && row[key] != null ? String(row[key]).trim() : "");

            return {
              name: safe(nameKey),
              roll: safe(rollKey),
              email: safe(emailKey),
              slot: safe(slotKey),
            };
          })
          .filter((student) => student.name || student.roll || student.email);

        if (!cancelled) {
          setStudents(rows);
          localStorage.setItem("gym_allocation_data", JSON.stringify(rows));
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

  // Sync state mutations to storage
  const updateDataState = (updatedList) => {
    setStudents(updatedList);
    localStorage.setItem("gym_allocation_data", JSON.stringify(updatedList));
  };

  // ============================================================
  // ADMIN AUTHENTICATION HANDLERS
  // ============================================================

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminInputKey === HARDCODED_ADMIN_KEY) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminInputKey("");
      setAdminAuthError("");
    } else {
      setAdminAuthError("Invalid Admin Key. Please try again.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
  };

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setFormData({ name: "", roll: "", email: "", slot: "SLOT 1" });
    setShowEntryModal(true);
  };

  const handleOpenEditModal = (originalIndex) => {
    setEditingIndex(originalIndex);
    setFormData({ ...students[originalIndex] });
    setShowEntryModal(true);
  };

  const handleDeleteEntry = (originalIndex) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      const updated = students.filter((_, idx) => idx !== originalIndex);
      updateDataState(updated);
    }
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.roll) {
      alert("Name and Roll Number are required.");
      return;
    }

    let updated = [...students];
    if (editingIndex !== null) {
      updated[editingIndex] = formData;
    } else {
      updated.unshift(formData);
    }

    updateDataState(updated);
    setShowEntryModal(false);
  };

  // ============================================================
  // HELPERS & COMPUTED DATA
  // ============================================================

  const getSlotNumber = (slot) => {
    const value = String(slot || "");
    const match = value.match(/SLOT\s*([0-9]{1,2})/i) || value.match(/\b([0-9]{1,2})\b/);
    return match ? parseInt(match[1], 10) : null;
  };

  const slotCounts = useMemo(() => {
    const counts = {};
    slotInfo.forEach((slot) => { counts[slot.num] = 0; });
    students.forEach((student) => {
      const slotNumber = getSlotNumber(student.slot);
      if (slotNumber) counts[slotNumber] = (counts[slotNumber] || 0) + 1;
    });
    return counts;
  }, [students]);

  const activeSlots = useMemo(() => Object.values(slotCounts).filter((c) => c > 0).length, [slotCounts]);

  const mostPopularSlot = useMemo(() => {
    let bestSlot = null;
    let highestCount = 0;
    Object.entries(slotCounts).forEach(([slot, count]) => {
      if (count > highestCount) {
        highestCount = count;
        bestSlot = slot;
      }
    });
    return { slot: bestSlot, count: highestCount };
  }, [slotCounts]);

  const sortedAndFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = students.map((item, originalIndex) => ({ ...item, originalIndex })).filter((student) => {
      const matchesSearch =
        !query ||
        (student.name || "").toLowerCase().includes(query) ||
        (student.roll || "").toLowerCase().includes(query) ||
        (student.email || "").toLowerCase().includes(query);

      const matchesSlot =
        !slotFilter ||
        getSlotNumber(student.slot) === Number(slotFilter.replace("SLOT ", ""));

      return matchesSearch && matchesSlot;
    });

    result.sort((a, b) => {
      let aValue = a[sortBy] || "";
      let bValue = b[sortBy] || "";
      if (sortBy === "slot") {
        aValue = getSlotNumber(aValue) ?? 999;
        bValue = getSlotNumber(bValue) ?? 999;
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, search, slotFilter, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleSlotClick = (slotNumber) => {
    const selectedSlot = `SLOT ${slotNumber}`;
    setSlotFilter(slotFilter === selectedSlot ? "" : selectedSlot);
  };

  const clearFilters = () => {
    setSearch("");
    setSlotFilter("");
  };

  const hasFilters = Boolean(search) || Boolean(slotFilter);

  const downloadCSV = () => {
    const exportData = sortedAndFiltered.map(({ originalIndex, ...rest }) => rest);
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gym-allocation-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function slotBadgeClass(slot) {
    const number = getSlotNumber(slot);
    const classes = {
      1: "bg-yellow-50 text-yellow-700 border-yellow-300",
      2: "bg-cyan-50 text-cyan-700 border-cyan-300",
      3: "bg-green-50 text-green-700 border-green-300",
      4: "bg-red-50 text-red-700 border-red-300",
      5: "bg-purple-50 text-purple-700 border-purple-300",
      6: "bg-amber-50 text-amber-700 border-amber-300",
      7: "bg-pink-50 text-pink-700 border-pink-300",
      8: "bg-sky-50 text-sky-700 border-sky-300",
      9: "bg-indigo-50 text-indigo-700 border-indigo-300",
    };
    return classes[number] || "bg-gray-100 text-gray-700 border-gray-300";
  }

  function slotCardClass(color) {
    const colors = {
      yellow: "from-yellow-50 to-orange-50 border-yellow-200 hover:border-yellow-400",
      cyan: "from-cyan-50 to-blue-50 border-cyan-200 hover:border-cyan-400",
      green: "from-green-50 to-emerald-50 border-green-200 hover:border-green-400",
      red: "from-red-50 to-orange-50 border-red-200 hover:border-red-400",
      purple: "from-purple-50 to-fuchsia-50 border-purple-200 hover:border-purple-400",
      amber: "from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-400",
      pink: "from-pink-50 to-rose-50 border-pink-200 hover:border-pink-400",
      sky: "from-sky-50 to-blue-50 border-sky-200 hover:border-sky-400",
      indigo: "from-indigo-50 to-violet-50 border-indigo-200 hover:border-indigo-400",
    };
    return colors[color] || "from-gray-50 to-white border-gray-200";
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="ml-1 opacity-50">↕</span>;
    return sortOrder === "asc" ? <ChevronUp className="inline w-4 h-4" /> : <ChevronDown className="inline w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-3 md:p-6 lg:p-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/30">
          
          {/* HERO HEADER */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white">
            <div className="relative px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg">
                    <Dumbbell size={32} className="animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-300" />
                    <span className="text-sm font-semibold uppercase tracking-widest text-white/80">
                      Fitness Management
                    </span>
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight">GYM Slot Allocation</h1>
                <p className="mt-3 text-white/80 flex items-center gap-2">
                  <Calendar size={17} /> August 2026 • Updated Slot Schedule
                </p>
              </div>

              {/* ACTION / ADMIN TOGGLE BUTTON */}
              <div className="flex items-center gap-3 flex-wrap">
                {isAdmin ? (
                  <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 p-2 rounded-2xl">
                    <button
                      onClick={handleOpenAddModal}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all"
                    >
                      <Plus size={16} /> Add Member
                    </button>
                    <button
                      onClick={handleAdminLogout}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-sm transition-all"
                  >
                    <Lock size={16} /> Admin Login
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="p-5 md:p-7 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-5 shadow-lg">
                <div className="text-sm opacity-80 font-medium flex items-center gap-2">
                  <Users size={17} /> Total Members
                </div>
                <div className="text-3xl md:text-4xl font-black mt-2">{students.length}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Zap size={17} /> Active Slots
                </div>
                <div className="text-3xl md:text-4xl font-black text-slate-800 mt-2">
                  {activeSlots}<span className="text-base text-slate-400"> / 9</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <Trophy size={17} /> Popular Slot
                </div>
                <div className="text-3xl md:text-4xl font-black text-slate-800 mt-2">
                  {mostPopularSlot.slot ? `#${mostPopularSlot.slot}` : "--"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                  <Flame size={17} /> Slot 7
                </div>
                <div className="text-3xl md:text-4xl font-black mt-2">{slotCounts[7] || 0}</div>
              </div>
            </div>
          </div>

          {/* SLOT SCHEDULE CARDS */}
          <div className="px-5 md:px-7 pt-7">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="text-indigo-600" size={22} />
                  <h2 className="text-xl md:text-2xl font-black text-slate-800">Gym Slot Schedule</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">Click any slot to view its members</p>
              </div>
              {slotFilter && (
                <button
                  onClick={() => setSlotFilter("")}
                  className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-full"
                >
                  <CheckCircle2 size={14} /> Viewing {slotFilter} <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slotInfo.map(({ num, shortTime, color, icon }) => {
                const memberCount = slotCounts[num] || 0;
                const isSelected = slotFilter === `SLOT ${num}`;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSlotClick(num)}
                    className={`relative overflow-hidden text-left bg-gradient-to-br ${slotCardClass(color)} border rounded-2xl p-4 transition-all ${
                      isSelected ? "ring-4 ring-indigo-500/30 border-indigo-500 shadow-xl" : "hover:-translate-y-1 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center text-xl">{icon}</div>
                        <div>
                          <div className="text-xs font-bold uppercase text-slate-500">Slot {num}</div>
                          <div className="font-black text-slate-800 text-sm md:text-base">{shortTime}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center min-w-[62px] px-2 py-2 rounded-xl bg-white/80">
                        <Users size={16} className="text-indigo-600 mb-0.5" />
                        <span className="text-lg font-black text-slate-800">{memberCount}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTER & CONTROL PANEL */}
          <div className="p-5 md:p-7 mt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    placeholder="Search name, roll number, or email..."
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <select
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value)}
                    className="w-full lg:w-64 pl-11 pr-8 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">All Slots</option>
                    {slotInfo.map(({ num, time }) => (
                      <option key={num} value={`SLOT ${num}`}>
                        Slot {num} • {time}
                      </option>
                    ))}
                  </select>
                </div>

                {hasFilters && (
                  <button onClick={clearFilters} className="px-5 py-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold">
                    Clear
                  </button>
                )}

                <button onClick={downloadCSV} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg">
                  <Download size={18} /> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* MEMBERS DATA TABLE */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-24">
                <Dumbbell className="mx-auto text-indigo-600 animate-spin" size={32} />
                <p className="mt-4 text-slate-600 font-semibold">Loading gym allocation data...</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 text-white">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs uppercase font-bold">#</th>
                    <th onClick={() => handleSort("name")} className="px-5 py-4 text-left text-xs uppercase font-bold cursor-pointer whitespace-nowrap">
                      Name <SortIcon column="name" />
                    </th>
                    <th onClick={() => handleSort("roll")} className="px-5 py-4 text-left text-xs uppercase font-bold cursor-pointer whitespace-nowrap">
                      Roll Number <SortIcon column="roll" />
                    </th>
                    <th className="px-5 py-4 text-left text-xs uppercase font-bold">Email</th>
                    <th onClick={() => handleSort("slot")} className="px-5 py-4 text-left text-xs uppercase font-bold cursor-pointer whitespace-nowrap">
                      Gym Slot <SortIcon column="slot" />
                    </th>
                    {isAdmin && <th className="px-5 py-4 text-center text-xs uppercase font-bold">Admin Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {sortedAndFiltered.map((student, index) => (
                    <tr key={index} className="hover:bg-indigo-50/50 transition-all">
                      <td className="px-5 py-4 text-xs font-bold text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4 font-bold text-slate-800">{student.name || "Unnamed"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">{student.roll || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{student.email || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-3 py-1.5 rounded-full border text-xs font-black ${slotBadgeClass(student.slot)}`}>
                          {student.slot || "Unassigned"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(student.originalIndex)}
                              className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              title="Edit Entry"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(student.originalIndex)}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN AUTH MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-black text-xl text-slate-800">
                <Lock className="text-indigo-600" size={24} /> Admin Access
              </div>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {adminAuthError && <p className="text-red-500 text-xs font-bold">{adminAuthError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ENTER ADMIN KEY</label>
                <input
                  type="password"
                  value={adminInputKey}
                  onChange={(e) => setAdminInputKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Key (Default: admin123)"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg">
                Authenticate Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT MEMBER MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl text-slate-800">
                {editingIndex !== null ? "Edit Student Entry" : "Add New Student"}
              </h3>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ROLL NUMBER</label>
                <input
                  type="text"
                  required
                  value={formData.roll}
                  onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ALLOCATED SLOT</label>
                <select
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {slotInfo.map((s) => (
                    <option key={s.num} value={`SLOT ${s.num}`}>
                      Slot {s.num} ({s.time})
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                <Save size={18} /> Save Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
