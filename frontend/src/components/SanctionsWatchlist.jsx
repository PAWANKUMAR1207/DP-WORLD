import { useState } from "react";
import { AlertTriangle, Shield, Globe, Calendar, Plus, Edit2, Trash2, X, Check, Search } from "lucide-react";

const defaultEntities = [
  {
    id: 1,
    name: "Huawei Technologies Co., Ltd.",
    country: "China",
    authority: "OFAC / BIS",
    dateAdded: "2019-05-16",
    riskTier: "High",
    category: "Technology / Telecommunications",
    reason: "Export control violations, national security concerns",
  },
  {
    id: 2,
    name: "Wagner Group (PMC)",
    country: "Russia",
    authority: "OFAC / EU / UN",
    dateAdded: "2017-06-20",
    riskTier: "Critical",
    category: "Private Military Company",
    reason: "Conflict minerals, human rights abuses, destabilization activities",
  },
  {
    id: 3,
    name: "Islamic Republic of Iran Shipping Lines (IRISL)",
    country: "Iran",
    authority: "OFAC / EU",
    dateAdded: "2020-06-08",
    riskTier: "Critical",
    category: "Maritime / Shipping",
    reason: "Proliferation activities, sanctions evasion",
  },
  {
    id: 4,
    name: "Ocean Maritime Management Co., Ltd.",
    country: "North Korea",
    authority: "UN / OFAC",
    dateAdded: "2014-07-28",
    riskTier: "Critical",
    category: "Maritime / Shipping",
    reason: "Arms smuggling, UN sanctions violations",
  },
  {
    id: 5,
    name: "Sovcomflot PJSC",
    country: "Russia",
    authority: "OFAC / UK / EU",
    dateAdded: "2022-02-24",
    riskTier: "High",
    category: "Oil & Gas Shipping",
    reason: "Russian energy sector, war in Ukraine",
  },
  {
    id: 6,
    name: "Dalian Ocean Fishing Co., Ltd.",
    country: "China",
    authority: "CBP / NOAA",
    dateAdded: "2021-05-28",
    riskTier: "Medium",
    category: "Fishing / IUU",
    reason: "Forced labor, illegal fishing (IUU), human rights abuses",
  },
  {
    id: 7,
    name: "Cosco Shipping Tanker (Dalian)",
    country: "China",
    authority: "OFAC",
    dateAdded: "2019-09-25",
    riskTier: "High",
    category: "Oil Shipping",
    reason: "Iranian oil trade, sanctions evasion",
  },
  {
    id: 8,
    name: "Korea Shipbuilding & Offshore Engineering",
    country: "South Korea",
    authority: "BIS",
    dateAdded: "2023-04-12",
    riskTier: "Medium",
    category: "Shipbuilding",
    reason: "Technology diversion to sanctioned entities",
  },
  {
    id: 9,
    name: "Port of Sevastopol",
    country: "Crimea",
    authority: "OFAC / EU / UK",
    dateAdded: "2014-12-19",
    riskTier: "High",
    category: "Port Authority",
    reason: "Annexation of Crimea, Russian occupation",
  },
  {
    id: 10,
    name: "Hennesea Holdings Limited",
    country: "UAE / Hong Kong",
    authority: "OFAC",
    dateAdded: "2023-03-02",
    riskTier: "High",
    category: "Shipping / Logistics",
    reason: "Russian oil price cap violations",
  },
  {
    id: 11,
    name: "Star Petroleum Refining Public Co.",
    country: "Thailand",
    authority: "OFAC",
    dateAdded: "2023-08-08",
    riskTier: "Medium",
    category: "Petroleum Refining",
    reason: "Iranian oil purchases, sanctions evasion",
  },
  {
    id: 12,
    name: "Rosnefteflot JSC",
    country: "Russia",
    authority: "OFAC / EU",
    dateAdded: "2022-02-24",
    riskTier: "High",
    category: "Tanker Fleet",
    reason: "Rosneft subsidiary, Russian energy exports",
  },
];

const riskTierStyles = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-green-100 text-green-700 border-green-200",
};

const emptyForm = {
  name: "",
  country: "",
  authority: "",
  dateAdded: new Date().toISOString().split("T")[0],
  riskTier: "Medium",
  category: "",
  reason: "",
};

export default function SanctionsWatchlist() {
  const [entities, setEntities] = useState(defaultEntities);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const filteredEntities = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setIsAdding(true);
    setFormData(emptyForm);
  };

  const handleEdit = (entity) => {
    setEditingId(entity.id);
    setFormData({ ...entity });
  };

  const handleDelete = (id) => {
    if (confirm("Delete this entity from the watchlist?")) {
      setEntities(entities.filter((e) => e.id !== id));
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    
    if (isAdding) {
      const newEntity = { ...formData, id: Date.now() };
      setEntities([newEntity, ...entities]);
      setIsAdding(false);
    } else {
      setEntities(entities.map((e) => (e.id === editingId ? { ...formData, id: editingId } : e)));
      setEditingId(null);
    }
    setFormData(emptyForm);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const isEditing = isAdding || editingId !== null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Sanctions Watchlist</h3>
            <p className="text-sm text-slate-500">Active sanctions by OFAC, UN, EU authorities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700">{entities.length} Entities</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={isEditing}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Entity
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, country, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {isEditing && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-4 text-sm font-semibold text-slate-900">
            {isAdding ? "Add New Sanctioned Entity" : "Edit Entity"}
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Entity Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Company or entity name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="e.g. Russia, China"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="e.g. Shipping, Technology"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Authority</label>
              <input
                type="text"
                value={formData.authority}
                onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="e.g. OFAC, UN"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date Added</label>
              <input
                type="date"
                value={formData.dateAdded}
                onChange={(e) => setFormData({ ...formData, dateAdded: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Risk Tier</label>
              <select
                value={formData.riskTier}
                onChange={(e) => setFormData({ ...formData, riskTier: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Reason for Sanction</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Brief description of sanction reason"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 text-sm text-slate-500">
              <th className="pb-3 font-medium">Entity Name</th>
              <th className="pb-3 font-medium">Country</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Authority</th>
              <th className="pb-3 font-medium">Added</th>
              <th className="pb-3 font-medium">Risk</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredEntities.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">
                  No entities match your search
                </td>
              </tr>
            ) : (
              filteredEntities.map((entity) => (
                <tr
                  key={entity.id}
                  className="border-b border-slate-50 transition hover:bg-slate-50/50"
                >
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium text-slate-900">{entity.name}</p>
                      <p className="text-xs text-slate-500">{entity.reason}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-700">{entity.country}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{entity.category}</td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-slate-700">{entity.authority}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {entity.dateAdded}
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskTierStyles[entity.riskTier]}`}
                    >
                      {entity.riskTier}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(entity)}
                        disabled={isEditing}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entity.id)}
                        disabled={isEditing}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <strong>Port Officer Guidance:</strong> Cross-reference all incoming manifests against this watchlist. 
        Flag any shipments involving these entities or their known subsidiaries for immediate secondary inspection.
      </div>
    </div>
  );
}
