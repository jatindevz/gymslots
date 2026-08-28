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
  ChevronUp,
  ChevronDown,
  X,
  Lock,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Save,
  AlertTriangle,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Settings,
  UserCheck,
  Zap,
  Award,
} from "lucide-react";

/**
 * ============================================================
 * CONFIGURATION & CONSTANTS
 * ============================================================
 */
const HARDCODED_ADMIN_KEY = "IIITDMK_Gym";
const DEFAULT_SLOT_CAPACITY = 35;

export default function GymAllocationDashboard({
  csvPath = "/data/results-new.csv",
}) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'powerlifting'

  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Custom Slot Capacity Configuration
  const [slotCapacities, setSlotCapacities] = useState({
    "SLOT 1": 35,
    "SLOT 2": 35,
    "SLOT 3": 35,
    "SLOT 4": 35,
    "SLOT 5": 35,
    "SLOT 6": 35,
    "SLOT 7": 20, // Slot 7 total capacity is 20
    "SLOT 8": 35,
    "SLOT 9": 35,
  });

  // Reservations Configuration (Slot 7 has 15 reserved for Powerlifting)
  const slotReservations = useMemo(
    () => ({
      "SLOT 7": { reservedFor: "Powerlifting", count: 15 },
    }),
    []
  );

  const [showCapacityEditor, setShowCapacityEditor] = useState(false);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInputKey, setAdminInputKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState("");

  // Modal for Add / Edit
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    roll: "",
    email: "",
    slot: "SLOT 1",
    isPowerlifter: false,
  });

  // Custom Confirmation Dialog State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    indicesToDelete: [],
    title: "",
    message: "",
  });

  // Multiple Selection State
  const [selectedIndices, setSelectedIndices] = useState([]);

  // Master Category List
  const slotCategories = useMemo(
    () => [
      { id: "SLOT 1", type: "standard", time: "4:30 AM – 5:30 AM" },
      { id: "SLOT 2", type: "standard", time: "5:30 AM – 7:00 AM" },
      { id: "SLOT 3", type: "standard", time: "7:00 AM – 8:30 AM" },
      { id: "SLOT 4", type: "standard", time: "2:30 PM – 4:00 PM" },
      { id: "SLOT 5", type: "standard", time: "4:00 PM – 5:30 PM" },
      { id: "SLOT 6", type: "standard", time: "5:30 PM – 7:00 PM" },
      { id: "SLOT 7", type: "standard", time: "7:00 PM – 8:30 PM", note: "15 Seats Powerlifting Reserved" },
      { id: "SLOT 8", type: "standard", time: "8:30 PM – 10:00 PM" },
      { id: "SLOT 9", type: "standard", time: "10:00 PM – 11:30 PM" },
      { id: "Invalid email ID", type: "special", time: "Requires Email Fix" },
      { id: "No slot allocated", type: "special", time: "Unassigned Students" },
    ],
    []
  );

  const getNormalizedSlot = (slotValue) => {
    const val = String(slotValue || "").trim();
    if (!val) return "No slot allocated";
    if (val.toLowerCase().includes("invalid")) return "Invalid email ID";
    if (val.toLowerCase().includes("no slot") || val.toLowerCase().includes("not allocated")) return "No slot allocated";
    
    const match = val.match(/SLOT\s*([0-9]{1,2})/i) || val.match(/\b([0-9]{1,2})\b/);
    if (match) return `SLOT ${parseInt(match[1], 10)}`;
    
    return val;
  };

  const getSlotDisplayLabel = (slotValue) => {
    const normalized = getNormalizedSlot(slotValue);
    const category = slotCategories.find((cat) => cat.id === normalized);
    if (!category) return normalized;
    if (category.type === "special") return category.id;
    return `${category.id} (${category.time})`;
  };

  // ============================================================
  // LOAD DATA & INITIALIZATION
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    try {
      const savedCapacities = typeof window !== "undefined" ? localStorage.getItem("gym_slot_capacities_v2") : null;
      if (savedCapacities) {
        setSlotCapacities(JSON.parse(savedCapacities));
      }
    } catch (e) {
      console.error("Storage error:", e);
    }

    try {
      const localData = typeof window !== "undefined" ? localStorage.getItem("gym_allocation_data_v2") : null;
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isMounted) {
            setStudents(parsed);
            setLoading(false);
          }
          return;
        }
      }
    } catch (e) {
      console.error("Local storage error:", e);
    }

    fetch(csvPath)
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.text();
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
              return null;
            };

            const nameKey = findKey(row, ["FullName", "Full Name", "Name", "FULLNAME"]);
            const rollKey = findKey(row, ["RollNumber", "Roll Number", "Roll", "ROLLNUMBER", "ROLL"]);
            const emailKey = findKey(row, ["Email", "E-mail", "EMAIL"]);
            const slotKey = findKey(row, ["Allocated Slot", "AllocatedSlot", "Allocated", "Slot", "SLOT"]);
            const plKey = findKey(row, ["Powerlifting", "IsPowerlifter", "Category"]);

            const safe = (key) => (key && row[key] != null ? String(row[key]).trim() : "");
            const isPowerlifterVal = plKey ? String(row[plKey]).toLowerCase().includes("powerlifting") || String(row[plKey]).toLowerCase() === "true" : false;

            return {
              name: safe(nameKey),
              roll: safe(rollKey),
              email: safe(emailKey),
              slot: safe(slotKey),
              isPowerlifter: isPowerlifterVal,
            };
          })
          .filter((student) => student.name || student.roll || student.email);

        if (isMounted) {
          setStudents(rows);
          if (typeof window !== "undefined") {
            localStorage.setItem("gym_allocation_data_v2", JSON.stringify(rows));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("CSV error:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [csvPath]);

  const updateDataState = (updatedList) => {
    setStudents(updatedList);
    if (typeof window !== "undefined") {
      localStorage.setItem("gym_allocation_data_v2", JSON.stringify(updatedList));
    }
    setSelectedIndices([]);
  };

  const handleCapacityChange = (slotId, newCapacity) => {
    const updated = { ...slotCapacities, [slotId]: Math.max(1, parseInt(newCapacity, 10) || 1) };
    setSlotCapacities(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("gym_slot_capacities_v2", JSON.stringify(updated));
    }
  };

  // ============================================================
  // ADMIN AUTH
  // ============================================================

  const isPasswordValid = adminInputKey === HARDCODED_ADMIN_KEY;

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (isPasswordValid) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminInputKey("");
      setAdminAuthError("");
    } else {
      setAdminAuthError("Invalid Admin Key. Access denied.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setSelectedIndices([]);
    setShowCapacityEditor(false);
  };

  // ============================================================
  // MULTI-SELECT HANDLERS
  // ============================================================

  const toggleSelectAll = (filteredItems) => {
    const currentFilteredIndices = filteredItems.map((item) => item.originalIndex);
    const allSelected = currentFilteredIndices.every((idx) => selectedIndices.includes(idx));

    if (allSelected) {
      setSelectedIndices(selectedIndices.filter((idx) => !currentFilteredIndices.includes(idx)));
    } else {
      const combined = Array.from(new Set([...selectedIndices, ...currentFilteredIndices]));
      setSelectedIndices(combined);
    }
  };

  const toggleSelectRow = (originalIndex) => {
    if (selectedIndices.includes(originalIndex)) {
      setSelectedIndices(selectedIndices.filter((idx) => idx !== originalIndex));
    } else {
      setSelectedIndices([...selectedIndices, originalIndex]);
    }
  };

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setFormData({ name: "", roll: "", email: "", slot: "SLOT 1", isPowerlifter: activeTab === "powerlifting" });
    setShowEntryModal(true);
  };

  const handleOpenEditModal = (originalIndex) => {
    setEditingIndex(originalIndex);
    setFormData({ ...students[originalIndex] });
    setShowEntryModal(true);
  };

  const triggerSingleDelete = (originalIndex, name) => {
    setDeleteConfirmModal({
      isOpen: true,
      indicesToDelete: [originalIndex],
      title: "Remove Member",
      message: `Are you sure you want to remove ${name || "this member"} from allocations?`,
    });
  };

  const triggerBulkDelete = () => {
    if (selectedIndices.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      indicesToDelete: selectedIndices,
      title: `Remove ${selectedIndices.length} Members`,
      message: `Are you sure you want to remove the ${selectedIndices.length} selected member records?`,
    });
  };

  const executeDelete = () => {
    const targets = deleteConfirmModal.indicesToDelete;
    const updated = students.filter((_, idx) => !targets.includes(idx));
    updateDataState(updated);
    setDeleteConfirmModal({ isOpen: false, indicesToDelete: [], title: "", message: "" });
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.roll) {
      alert("Name and Roll Number are required fields.");
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
  // COMPUTED STATS & NUMBERS
  // ============================================================

  const categoryCounts = useMemo(() => {
    const counts = {};
    slotCategories.forEach((cat) => { counts[cat.id] = 0; });
    
    students.forEach((student) => {
      const category = getNormalizedSlot(student.slot);
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [students, slotCategories]);

  // Powerlifting counts specifically in Slot 7
  const powerliftingCountInSlot7 = useMemo(() => {
    return students.filter(
      (s) => getNormalizedSlot(s.slot) === "SLOT 7" && (s.isPowerlifter || false)
    ).length;
  }, [students]);

  const totalPowerliftingStudents = useMemo(() => {
    return students.filter((s) => s.isPowerlifter).length;
  }, [students]);

  const totalCapacitySum = useMemo(() => {
    return Object.values(slotCapacities).reduce((acc, cap) => acc + (cap || 0), 0);
  }, [slotCapacities]);

  const totalAllocatedStandard = useMemo(() => {
    return slotCategories
      .filter((c) => c.type === "standard")
      .reduce((acc, c) => acc + (categoryCounts[c.id] || 0), 0);
  }, [categoryCounts, slotCategories]);

  const totalAvailableStandard = Math.max(0, totalCapacitySum - totalAllocatedStandard);

  const sortedAndFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = students
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((student) => {
        // Tab Filter
        if (activeTab === "powerlifting" && !student.isPowerlifter) return false;

        // Search Filter
        const matchesSearch =
          !query ||
          (student.name || "").toLowerCase().includes(query) ||
          (student.roll || "").toLowerCase().includes(query) ||
          (student.email || "").toLowerCase().includes(query);

        // Category Filter
        const normalizedStudentSlot = getNormalizedSlot(student.slot);
        const matchesSlot = !slotFilter || normalizedStudentSlot === slotFilter;

        return matchesSearch && matchesSlot;
      });

    result.sort((a, b) => {
      let aValue = a[sortBy] || "";
      let bValue = b[sortBy] || "";
      
      if (sortBy === "slot") {
        aValue = getNormalizedSlot(aValue);
        bValue = getNormalizedSlot(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, search, slotFilter, sortBy, sortOrder, activeTab]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
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
    link.download = `gym-allocation-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="ml-1 text-slate-400">↕</span>;
    return sortOrder === "asc" ? <ChevronUp className="inline w-4 h-4 text-slate-800" /> : <ChevronDown className="inline w-4 h-4 text-slate-800" />;
  };

  const areAllFilteredSelected = useMemo(() => {
    if (sortedAndFiltered.length === 0) return false;
    return sortedAndFiltered.every((item) => selectedIndices.includes(item.originalIndex));
  }, [sortedAndFiltered, selectedIndices]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 p-3 sm:p-6 lg:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* TOP BAR / NAVIGATION */}
        <header className="bg-slate-800 border border-slate-700/80 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Dumbbell size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">IIITDMK Gym Slot Allocation</h1>
                <span className="text-xs bg-indigo-950 text-indigo-300 font-medium px-2.5 py-0.5 rounded-md border border-indigo-800">
                  AY 2026-27
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar size={13} /> Official Student Allocation Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* VIEW NAVIGATION TABS */}
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
              <button
                onClick={() => { setActiveTab("all"); setSlotFilter(""); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Allocations
              </button>
              <button
                onClick={() => { setActiveTab("powerlifting"); setSlotFilter(""); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === "powerlifting"
                    ? "bg-amber-600 text-white shadow"
                    : "text-amber-400 hover:text-amber-300"
                }`}
              >
                <Zap size={13} /> Powerlifting Wing
              </button>
            </div>

            {isAdmin ? (
              <>
                <button
                  onClick={() => setShowCapacityEditor(!showCapacityEditor)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-650 text-slate-200 text-xs font-semibold border border-slate-600 transition"
                >
                  <Settings size={14} /> Capacity
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  <Plus size={14} /> Add Member
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-600 transition"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setShowAdminModal(true);
                  setAdminInputKey("");
                  setAdminAuthError("");
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold border border-slate-600 transition shadow-sm"
              >
                <Lock size={14} /> Admin Access
              </button>
            )}
          </div>
        </header>

        {/* METRICS DASHBOARD */}
        {activeTab === "all" ? (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Total Registrations</span>
                <Users size={16} className="text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{students.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Total recorded applications</div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Available Seats</span>
                <UserCheck size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                {totalAvailableStandard}
                <span className="text-xs text-slate-400 font-normal ml-1.5">/ {totalCapacitySum}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Across standard slots 1–9</div>
            </div>

            <div className="bg-slate-800/90 border border-amber-500/30 bg-amber-950/20 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-amber-300 text-xs font-medium mb-1">
                <span>Slot 7 Powerlifting</span>
                <Award size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
                {powerliftingCountInSlot7}
                <span className="text-xs text-amber-200/60 font-normal ml-1.5">/ 15 Reserved</span>
              </div>
              <div className="text-[11px] text-amber-300/70 mt-1">7:00 PM – 8:30 PM (Cap: 20)</div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                <span>Unallocated / Invalid</span>
                <AlertCircle size={16} className="text-rose-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-200 tracking-tight">
                {(categoryCounts["Invalid email ID"] || 0) + (categoryCounts["No slot allocated"] || 0)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Requires review</div>
            </div>
          </section>
        ) : (
          /* POWERLIFTING DEDICATED HERO BANNER */
          <section className="bg-gradient-to-r from-amber-950/80 via-slate-800 to-slate-800 border border-amber-500/40 rounded-2xl p-6 shadow-xl text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Zap size={12} /> Special Athlete Wing
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-amber-100">
                  Powerlifting Dedicated Slot Management
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Slot 7 (7:00 PM – 8:30 PM) is configured with a restricted maximum capacity of <strong>20 students</strong>. Exactly <strong>15 seats</strong> are strictly reserved for official Powerlifting Team athletes, leaving <strong>5 public slots</strong> for general allocation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/30 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Slot 7 Total Cap</span>
                  <span className="text-2xl font-black text-amber-400">20</span>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/30 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Reserved Athletes</span>
                  <span className="text-2xl font-black text-amber-400">15</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OPTIONAL CAPACITY SETTINGS PANEL (ADMIN ONLY) */}
        {isAdmin && showCapacityEditor && (
          <div className="bg-slate-800 border border-indigo-500/30 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings size={16} className="text-indigo-400" /> Configure Slot Capacities
              </h3>
              <button
                onClick={() => setShowCapacityEditor(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {slotCategories.filter((c) => c.type === "standard").map((cat) => (
                <div key={cat.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-300">{cat.id}</label>
                    {slotReservations[cat.id] && (
                      <span className="text-[10px] text-amber-400 font-bold">Res: {slotReservations[cat.id].count}</span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={slotCapacities[cat.id] || DEFAULT_SLOT_CAPACITY}
                    onChange={(e) => handleCapacityChange(cat.id, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN PANEL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* FULL SLOT LIST & CATEGORY GRID HEADER */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {activeTab === "powerlifting" ? "Powerlifting Slot Allocations" : "Full Gym Slot List & Availability"}
                </h2>
                <p className="text-xs text-slate-500">Filter list entries by selecting a slot card below</p>
              </div>

              {slotFilter && (
                <button
                  onClick={() => setSlotFilter("")}
                  className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                >
                  <X size={13} /> Active Filter: {slotFilter}
                </button>
              )}
            </div>

            {/* SLOT CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slotCategories.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const capacity = slotCapacities[cat.id] || DEFAULT_SLOT_CAPACITY;
                const available = cat.type === "standard" ? Math.max(0, capacity - count) : null;
                const percent = cat.type === "standard" ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
                const isSelected = slotFilter === cat.id;
                const isFull = cat.type === "standard" && available === 0;
                const reservation = slotReservations[cat.id];

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSlotFilter(isSelected ? "" : cat.id)}
                    className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                        : reservation
                        ? "bg-amber-50/40 hover:border-amber-400 border-amber-200 text-slate-800 hover:shadow-sm"
                        : "bg-white hover:border-slate-300 border-slate-200 text-slate-800 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? "text-indigo-300" : "text-slate-500"}`}>
                            {cat.id}
                          </span>
                          {reservation && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                              Powerlifting
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold mt-0.5">{cat.time}</div>
                      </div>

                      <div className="text-right">
                        <span className={`text-lg font-extrabold ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {count}
                        </span>
                        {cat.type === "standard" && (
                          <span className={`text-xs ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                            /{capacity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AVAILABILITY STATUS & PROGRESS BAR FOR STANDARD SLOTS */}
                    {cat.type === "standard" ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                            {reservation ? (
                              <span className="text-amber-700 font-semibold">15 Reserved | {Math.max(0, capacity - 15 - Math.max(0, count - 15))} Public Left</span>
                            ) : isFull ? (
                              "Fully Booked"
                            ) : (
                              `${available} seat${available === 1 ? "" : "s"} left`
                            )}
                          </span>
                          <span className={`font-semibold ${isFull ? "text-rose-400" : percent > 80 ? "text-amber-500" : isSelected ? "text-emerald-400" : "text-emerald-600"}`}>
                            {percent}%
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? "bg-slate-700" : "bg-slate-100"}`}>
                          <div
                            className={`h-full transition-all duration-300 ${
                              isFull
                                ? "bg-rose-500"
                                : percent > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-400 italic">
                        Special Category Record
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTROLS BAR */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, roll, or email..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <select
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
                  className="w-full sm:w-56 pl-8 pr-7 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 text-slate-700"
                >
                  <option value="">All Categories ({students.length})</option>
                  {slotCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.id} ({categoryCounts[cat.id] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <button
              onClick={downloadCSV}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition shadow-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* BULK ACTION BANNER FOR ADMIN */}
          {isAdmin && selectedIndices.length > 0 && (
            <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 font-medium">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-rose-600" />
                <span>{selectedIndices.length} items selected</span>
              </div>
              <button
                onClick={triggerBulkDelete}
                className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-xs transition"
              >
                <Trash2 size={13} /> Delete Selected
              </button>
            </div>
          )}

          {/* DATA TABLE */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <Dumbbell className="mx-auto animate-spin mb-3 text-indigo-500" size={24} />
                <p className="text-xs font-medium">Loading allocation records...</p>
              </div>
            ) : sortedAndFiltered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-sm font-medium">No members found matching criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    {isAdmin && (
                      <th className="p-3.5 text-center w-10">
                        <button type="button" onClick={() => toggleSelectAll(sortedAndFiltered)}>
                          {areAllFilteredSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-400" />}
                        </button>
                      </th>
                    )}
                    <th className="p-3.5 w-12 text-center text-slate-400">#</th>
                    <th onClick={() => handleSort("name")} className="p-3.5 cursor-pointer hover:text-slate-900">
                      Member Name <SortIcon column="name" />
                    </th>
                    <th onClick={() => handleSort("roll")} className="p-3.5 cursor-pointer hover:text-slate-900">
                      Roll Number <SortIcon column="roll" />
                    </th>
                    <th className="p-3.5">Email Address</th>
                    <th className="p-3.5">Category Tag</th>
                    <th onClick={() => handleSort("slot")} className="p-3.5 cursor-pointer hover:text-slate-900">
                      Allocated Slot / Status <SortIcon column="slot" />
                    </th>
                    {isAdmin && <th className="p-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedAndFiltered.map((student, idx) => {
                    const isSelected = selectedIndices.includes(student.originalIndex);
                    const normSlot = getNormalizedSlot(student.slot);
                    const isInvalid = normSlot === "Invalid email ID";
                    const isUnallocated = normSlot === "No slot allocated";

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? "bg-indigo-50/50" : ""
                        }`}
                      >
                        {isAdmin && (
                          <td className="p-3.5 text-center">
                            <button type="button" onClick={() => toggleSelectRow(student.originalIndex)}>
                              {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-300" />}
                            </button>
                          </td>
                        )}
                        <td className="p-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900">{student.name || "Unnamed"}</td>
                        <td className="p-3.5 font-mono text-slate-600">{student.roll || "—"}</td>
                        <td className="p-3.5 text-slate-600">{student.email || "—"}</td>
                        <td className="p-3.5">
                          {student.isPowerlifter ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Zap size={10} /> Powerlifter
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Standard</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                              isInvalid
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : isUnallocated
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : normSlot === "SLOT 7"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            {getSlotDisplayLabel(student.slot)}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(student.originalIndex)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => triggerSingleDelete(student.originalIndex, student.name)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN LOGIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-indigo-600" /> Admin Authentication
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {adminAuthError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-xs font-semibold">
                  {adminAuthError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Passkey</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={adminInputKey}
                    onChange={(e) => setAdminInputKey(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600"
                    placeholder="Enter admin key"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={!isPasswordValid}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition ${
                  isPasswordValid
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT MEMBER MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingIndex !== null ? "Edit Allocation Entry" : "Add New Allocation Entry"}
              </h3>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEntry} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  value={formData.roll}
                  onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Slot / Status</label>
                <select
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600"
                >
                  {slotCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.id} ({cat.time})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPowerlifter"
                  checked={formData.isPowerlifter}
                  onChange={(e) => setFormData({ ...formData, isPowerlifter: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isPowerlifter" className="text-xs font-semibold text-slate-700">
                  Tag as Powerlifting Student
                </label>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow flex items-center justify-center gap-1.5"
              >
                <Save size={15} /> Save Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{deleteConfirmModal.title}</h3>
            <p className="text-xs text-slate-500 mb-5">{deleteConfirmModal.message}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, indicesToDelete: [], title: "", message: "" })}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
