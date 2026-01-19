import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Search, Filter, Download, Users, Calendar } from "lucide-react";

export default function GymAllocationResults({ csvPath = "/data/results_Jan-Feb.csv" }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(csvPath)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch CSV (status ${r.status})`);
        return r.text();
      })
      .then((text) => {
        const parsed = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: true,
          dynamicTyping: false,
          trimHeaders: true
        });
        
        if (parsed.errors.length > 0) {
          console.warn("CSV parsing warnings:", parsed.errors);
        }

        const rows = parsed.data
          .map((r) => {
            const keys = Object.keys(r);
            return {
              name: (r.FULLNAME || "").toString().trim(),
              roll: (r.ROLLNUMBER || r.Roll || r.ROLL || r[keys[1]] || "").toString().trim(),
              email: (r.email || r.Email || r.EMAIL || r[keys[2]] || "").toString().trim(),
              duration: (r.Duration || r.Duration || r.DURATION || r[keys[4]] || "").toString().trim(),
              slot: (r.AllocatedSlot || r.Slot || r.SLOT || r[keys[4]] || "").toString().trim(),
            };
          })
          .filter(s => s.name || s.roll || s.email);

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

  const slotCounts = useMemo(() => {
    const counts = {};
    students.forEach((s) => {
      const slotUpper = (s.slot || "").toUpperCase();
      const match = slotUpper.match(/SLOT\s*(\d)/);
      if (match) {
        const key = `SLOT ${match[1]}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [students]);

  const durationCounts = useMemo(() => {
    const counts = {};
    students.forEach((s) => {
      const dur = s.duration || "Unknown";
      counts[dur] = (counts[dur] || 0) + 1;
    });
    return counts;
  }, [students]);

  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = students.filter((s) => {
      const matchesSearch =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.roll || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q);
      const matchesSlot = !slotFilter || (s.slot || "").toUpperCase().includes(slotFilter.toUpperCase());
      const matchesDuration = !durationFilter || (s.duration || "") === durationFilter;
      return matchesSearch && matchesSlot && matchesDuration;
    });

    result.sort((a, b) => {
      let aVal = a[sortBy] || "";
      let bVal = b[sortBy] || "";
      
      if (sortBy === "slot") {
        const aMatch = aVal.match(/\d+/);
        const bMatch = bVal.match(/\d+/);
        aVal = aMatch ? parseInt(aMatch[0]) : 999;
        bVal = bMatch ? parseInt(bMatch[0]) : 999;
      }
      
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, search, slotFilter, durationFilter, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const downloadCSV = () => {
    const csv = Papa.unparse(sortedAndFiltered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym-allocation-filtered-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  function slotBadgeClass(slot) {
    if (!slot) return "bg-gray-200 text-gray-800";
    const upper = slot.toUpperCase();
    if (upper.includes("SLOT 1")) return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    if (upper.includes("SLOT 2")) return "bg-cyan-100 text-cyan-800 border border-cyan-300";
    if (upper.includes("SLOT 3")) return "bg-green-100 text-green-800 border border-green-300";
    if (upper.includes("SLOT 4")) return "bg-red-100 text-red-800 border border-red-300";
    if (upper.includes("SLOT 5")) return "bg-purple-100 text-purple-800 border border-purple-300";
    return "bg-gray-100 text-gray-800 border border-gray-300";
  }

  const slotInfo = [
    { num: 1, time: "5:30 AM", color: "yellow" },
    { num: 2, time: "7:00 AM", color: "cyan" },
    { num: 3, time: "4:00 PM", color: "green" },
    { num: 4, time: "5:30 PM", color: "red" },
    { num: 5, time: "7:00 PM", color: "purple" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="px-6 md:px-8 py-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8" />
              <h1 className="text-3xl md:text-4xl font-bold">GYM Slot Allocation</h1>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Calendar className="w-4 h-4" />
              <p>January - February 2026 | Successfully Allocated Students</p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-xl shadow-lg">
                <div className="text-sm opacity-90 font-medium">Total Students</div>
                <div className="text-3xl font-bold mt-1">{students.length}</div>
              </div>

              {slotInfo.map(({ num, time, color }) => (
                <div key={num} className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                  <div className={`text-2xl font-bold text-${color}-600`}>
                    {slotCounts[`SLOT ${num}`] || 0}
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1">Slot {num}</div>
                  <div className="text-xs text-gray-500">{time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 bg-white">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none transition-colors"
                  placeholder="Search by name, roll number, or email..."
                />
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value)}
                    className="pl-9 pr-8 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="">All Slots</option>
                    {slotInfo.map(({ num, time }) => (
                      <option key={num} value={`SLOT ${num}`}>Slot {num} ({time})</option>
                    ))}
                  </select>
                </div>

                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none appearance-none bg-white cursor-pointer"
                >
                  <option value="">All Durations</option>
                  {Object.keys(durationCounts).map(dur => (
                    <option key={dur} value={dur}>{dur}</option>
                  ))}
                </select>

                <button
                  onClick={downloadCSV}
                  disabled={sortedAndFiltered.length === 0}
                  className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing <span className="font-semibold text-indigo-600">{sortedAndFiltered.length}</span> of {students.length} students
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading allocation data...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <p className="text-red-600 font-semibold">Error loading data</p>
                <p className="text-gray-600 text-sm mt-2">{error}</p>
              </div>
            ) : sortedAndFiltered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <p className="text-gray-600 font-semibold">No students found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold">#</th>
                    <th 
                      onClick={() => handleSort("name")}
                      className="px-4 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-white hover:bg-opacity-10"
                    >
                      Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th 
                      onClick={() => handleSort("roll")}
                      className="px-4 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-white hover:bg-opacity-10"
                    >
                      Roll {sortBy === "roll" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Email</th>
                    <th 
                      onClick={() => handleSort("duration")}
                      className="px-4 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-white hover:bg-opacity-10"
                    >
                      Duration {sortBy === "duration" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th 
                      onClick={() => handleSort("slot")}
                      className="px-4 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-white hover:bg-opacity-10"
                    >
                      Slot {sortBy === "slot" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedAndFiltered.map((s, idx) => (
                    <tr
                      key={`${s.roll || idx}-${idx}`}
                      className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-gray-500 text-sm">{idx + 1}</td>
                      <td className="px-4 py-4 font-semibold text-gray-900">{s.name}</td>
                      <td className="px-4 py-4 text-gray-700 font-mono text-sm">{s.roll}</td>
                      <td className="px-4 py-4 text-gray-600 text-sm">{s.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            s.duration === "Complete Semester" 
                              ? "bg-green-100 text-green-800 border border-green-300" 
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                        >
                          {s.duration}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${slotBadgeClass(s.slot)}`}>
                          {s.slot}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <footer className="text-center text-xs text-gray-500 bg-white rounded-lg shadow p-4">
          <p>Data source: <span className="font-mono text-gray-700">{csvPath}</span></p>
        </footer>
      </div>
    </div>
  );
}