"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { AlertPopup, FeedbackPopups } from "@/components/AppPopup";
import type { SystemUser } from "@/lib/auth/system-users";
import { useUi } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import {
  readSitePmChecklistConfig,
  type PmChecklistConfig,
  type PmChecklistKey,
  writeSitePmChecklistConfig
} from "@/lib/pm-checklist-config";
import {
  checklistTabs,
  configurationBackup,
  diagChecks,
  diagDevices,
  environmentMain,
  environmentPower,
  environmentSecurity,
  serverChecklist,
  storageChecklist,
  switchChecklist,
  synapseSystem,
  type DiagCheck
} from "@/lib/pm-checklist-data";
import {
  contractCountOptions,
  getContractCount,
  getSiteContractItems,
  getVisitCountForPmCycle,
  type SiteCatalogRecord,
  type SiteContractDetails,
  type SiteContractItem
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

type SiteTab = "customer" | "contract" | "synapse" | "server" | "switch" | "storage" | "environment" | "diag";
type InspectionTab = PmChecklistKey;

const tabs: { id: SiteTab; labelKey?: string; label: string }[] = [
  { id: "customer", labelKey: "sites.customerTab", label: "ข้อมูลลูกค้า" },
  { id: "contract", labelKey: "sites.contractTab", label: "ข้อมูลสัญญา" },
  ...checklistTabs.map((tab) => ({ id: tab.key, label: tab.title }))
];

const inspectionTabs = tabs.filter((tab): tab is { id: InspectionTab; labelKey?: string; label: string } => (
  tab.id !== "customer" && tab.id !== "contract"
));

const defaultDiagValues: Record<DiagCheck, boolean> = {
  cleaning: true,
  availability: true,
  abnormal: false,
  repaired: false
};

type DiagSet = {
  id: number;
  rows: Record<string, Record<DiagCheck, boolean>>;
};

function createDiagSet(id: number): DiagSet {
  return {
    id,
    rows: Object.fromEntries(
      diagDevices.map((device) => [
        device,
        { ...defaultDiagValues }
      ])
    ) as Record<string, Record<DiagCheck, boolean>>
  };
}

const checklistItemsByInspectionTab: Record<InspectionTab, string[]> = {
  synapse: [...synapseSystem, ...configurationBackup],
  server: serverChecklist,
  switch: switchChecklist,
  storage: storageChecklist,
  environment: [...environmentMain, ...environmentPower, ...environmentSecurity],
  diag: []
};

const primaryChecklistSectionByTab: Partial<Record<InspectionTab, string>> = {
  synapse: "synapseSystem",
  server: "serverChecklist",
  switch: "switchChecklist",
  storage: "storageChecklist",
  environment: "environmentMain"
};

const monthOptions = [
  { value: "01", th: "มกราคม", en: "January" },
  { value: "02", th: "กุมภาพันธ์", en: "February" },
  { value: "03", th: "มีนาคม", en: "March" },
  { value: "04", th: "เมษายน", en: "April" },
  { value: "05", th: "พฤษภาคม", en: "May" },
  { value: "06", th: "มิถุนายน", en: "June" },
  { value: "07", th: "กรกฎาคม", en: "July" },
  { value: "08", th: "สิงหาคม", en: "August" },
  { value: "09", th: "กันยายน", en: "September" },
  { value: "10", th: "ตุลาคม", en: "October" },
  { value: "11", th: "พฤศจิกายน", en: "November" },
  { value: "12", th: "ธันวาคม", en: "December" }
];

const emptySite: SiteCatalogRecord = {
  id: "",
  site: "",
  customer: "",
  contact: "",
  phone: "",
  province: "",
  region: "",
  owner: "",
  contract: "",
  contractDetails: {},
  address: "",
  department: "",
  email: ""
};

function resolveSelectedChecklistItems(config: PmChecklistConfig): Record<InspectionTab, string[]> {
  return inspectionTabs.reduce((items, tab) => {
    const defaultItems = checklistItemsByInspectionTab[tab.id];
    const sectionItems = Object.values(config.customItemsBySection[tab.id] ?? {}).flat();
    const legacyItems = config.customItems[tab.id] ?? [];
    const allItems = [...defaultItems, ...sectionItems, ...legacyItems];
    const savedItems = config.selectedItems[tab.id];
    items[tab.id] = savedItems ? allItems.filter((item) => savedItems.includes(item)) : allItems;
    return items;
  }, {} as Record<InspectionTab, string[]>);
}

function readCustomItemsBySection(config: PmChecklistConfig) {
  const customItemsBySection = { ...config.customItemsBySection };

  inspectionTabs.forEach((tab) => {
    const legacyItems = config.customItems[tab.id] ?? [];
    const primarySection = primaryChecklistSectionByTab[tab.id];

    if (legacyItems.length > 0 && primarySection) {
      customItemsBySection[tab.id] = {
        ...(customItemsBySection[tab.id] ?? {}),
        [primarySection]: [...new Set([
          ...(customItemsBySection[tab.id]?.[primarySection] ?? []),
          ...legacyItems
        ])]
      };
    }
  });

  return customItemsBySection;
}

function emptyContractItem(): SiteContractItem {
  return {
    contractNumber: "",
    projectName: "",
    pmCycle: "ครึ่งปี",
    visitCount: "2",
    visitMonths: []
  };
}

function normalizeContractItems(contractNumber: string, contractDetails: SiteContractDetails) {
  const siteLike = { contract: contractNumber, contractDetails };
  return getSiteContractItems(siteLike).map((contract) => ({
    ...emptyContractItem(),
    ...contract,
    visitMonths: Array.isArray(contract.visitMonths) ? contract.visitMonths : []
  }));
}

function writeContractDetailsRoot(contractDetails: SiteContractDetails, contracts: SiteContractItem[]) {
  const primaryContract = contracts[0] ?? emptyContractItem();

  return {
    ...contractDetails,
    contractCount: String(Math.min(6, Math.max(1, contracts.length))),
    contractEndDate: primaryContract.contractEndDate ?? "",
    contractNote: primaryContract.contractNote ?? "",
    contractNumber: primaryContract.contractNumber ?? "",
    contractStartDate: primaryContract.contractStartDate ?? "",
    contracts,
    pmCycle: primaryContract.pmCycle ?? "ครึ่งปี",
    projectName: primaryContract.projectName ?? "",
    visitCount: primaryContract.visitCount ?? "",
    visitMonths: primaryContract.visitMonths ?? []
  };
}

export default function SitesPage() {
  const { t } = useUi();
  const { data, error, isLoading, reload } = usePmData();
  const sites = data.siteCatalog;
  const regions = data.regions;
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const [modalSite, setModalSite] = useState<SiteCatalogRecord | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [siteStatusFilter, setSiteStatusFilter] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadSystemUsers() {
      try {
        const response = await fetch("/api/auth/users", { cache: "no-store" });
        const payload = await response.json() as { users?: SystemUser[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Cannot load users.");
        }

        if (isCurrent) {
          setSystemUsers(payload.users ?? []);
          setUsersError("");
        }
      } catch (loadError) {
        if (isCurrent) {
          setUsersError(loadError instanceof Error ? loadError.message : "Cannot load users.");
        }
      }
    }

    loadSystemUsers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sites.filter((site) => {
      const isActiveSite = site.owner.trim().length > 0;
      const searchableText = `${site.site} ${site.customer} ${site.province} ${site.owner} ${site.phone}`.toLowerCase();
      const matchesQuery = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      const matchesRegion = regionFilter ? site.region === regionFilter : true;
      const matchesStatus = siteStatusFilter
        ? siteStatusFilter === "active" ? isActiveSite : !isActiveSite
        : true;

      return matchesQuery && matchesRegion && matchesStatus;
    });
  }, [query, regionFilter, siteStatusFilter, sites]);

  const openAdd = () => {
    setModalMode("add");
    setModalSite(sites[0] ?? emptySite);
  };

  const openEdit = (site: SiteCatalogRecord) => {
    setModalMode("edit");
    setModalSite(site);
  };

  return (
    <AppShell>
      <div className="sitesPage">
        <FeedbackPopups loading={isLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error ?? usersError} />
        <PageTitle
          title={t("sites.title")}
          subtitle={`${sites.length} ${t("sites.countSubtitle")}`}
          actions={
            <button className="button primary" type="button" onClick={openAdd}>
              <Plus size={16} />
              {t("sites.addSite")}
            </button>
          }
        />

        <section className="toolbar">
          <SearchControl placeholder={t("sites.searchPlaceholder")} value={query} onChange={setQuery} />
          <select className="select" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            <option value="">{t("sites.allRegions")}</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          <select className="select" value={siteStatusFilter} onChange={(event) => setSiteStatusFilter(event.target.value)}>
            <option value="">{t("sites.allStatuses")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </select>
        </section>

        <section className="rows">
          {filteredSites.length > 0 ? filteredSites.map((site) => {
            const isActiveSite = site.owner.trim().length > 0;

            return (
              <button className="siteRow" key={site.id} type="button" onClick={() => openEdit(site)}>
                <div>
                  <strong>{site.site}</strong>
                  <span className={`statusPill ${isActiveSite ? "success" : "warning"}`}>
                    {isActiveSite ? t("common.active") : t("common.inactive")}
                  </span>
                </div>
                <small>
                  <UserRound size={13} /> {site.customer}
                  <span>{t("common.phonePrefix")} {site.phone}</span>
                  <span>{t("common.provincePrefix")} {site.province}</span>
                  <span>{t("common.ownerPrefix")}: {site.owner || "-"}</span>
                </small>
                <ChevronRight size={18} />
              </button>
            );
          }) : <EmptyState message={t("sites.noSites")} />}
        </section>

        {modalSite ? (
          <SiteModal
            mode={modalMode}
            site={modalSite}
            regions={regions}
            systemUsers={systemUsers}
            onClose={() => setModalSite(null)}
            onSaved={reload}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function SiteModal({
  mode,
  site,
  regions,
  systemUsers,
  onClose,
  onSaved
}: {
  mode: "add" | "edit";
  site: SiteCatalogRecord;
  regions: string[];
  systemUsers: SystemUser[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useUi();
  const [activeTab, setActiveTab] = useState<SiteTab>("customer");
  const [selectedOwner, setSelectedOwner] = useState(site.owner);
  const [contractNumber, setContractNumber] = useState(site.contract);
  const [contractDetails, setContractDetails] = useState<SiteContractDetails>(() => site.contractDetails ?? {});
  const [selectedContractIndex, setSelectedContractIndex] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInspectionTabs, setSelectedInspectionTabs] = useState<InspectionTab[]>(() => readSitePmChecklistConfig(site.id).selectedTabs);
  const [inspectionSetCounts, setInspectionSetCounts] = useState(() => readSitePmChecklistConfig(site.id).setCounts);
  const [selectedChecklistItems, setSelectedChecklistItems] = useState(() => resolveSelectedChecklistItems(readSitePmChecklistConfig(site.id)));
  const [customChecklistItemsBySection, setCustomChecklistItemsBySection] = useState(() => readCustomItemsBySection(readSitePmChecklistConfig(site.id)));
  const [diagMonitorCounts, setDiagMonitorCounts] = useState(() => readSitePmChecklistConfig(site.id).diagMonitorCounts);
  const [itemLabelsBySection, setItemLabelsBySection] = useState(() => readSitePmChecklistConfig(site.id).itemLabelsBySection);
  const title = mode === "add" ? t("sites.addModalTitle") : t("sites.editModalTitle");
  const contractCount = getContractCount(contractDetails);
  const contractItems = useMemo(() => normalizeContractItems(contractNumber, contractDetails), [contractDetails, contractNumber]);
  const selectedContract = contractItems[Math.min(selectedContractIndex, contractItems.length - 1)] ?? emptyContractItem();
  const visibleTabs = useMemo(() => (
    tabs.filter((tab) => tab.id === "customer" || tab.id === "contract" || selectedInspectionTabs.includes(tab.id as InspectionTab))
  ), [selectedInspectionTabs]);

  const updateContractCount = useCallback((count: number) => {
    const nextCount = Math.min(6, Math.max(1, count));
    const currentContracts = normalizeContractItems(contractNumber, contractDetails);
    const nextContracts = Array.from({ length: nextCount }, (_, index) => currentContracts[index] ?? emptyContractItem());

    setContractDetails((current) => writeContractDetailsRoot(current, nextContracts));
    setContractNumber(nextContracts[0]?.contractNumber ?? "");
    setSelectedContractIndex((current) => Math.min(current, nextCount - 1));
  }, [contractDetails, contractNumber]);

  const updateSelectedContract = useCallback((updates: Partial<SiteContractItem>) => {
    const currentContracts = normalizeContractItems(contractNumber, contractDetails);
    const nextContracts = currentContracts.map((contract, index) => (
      index === selectedContractIndex ? { ...contract, ...updates } : contract
    ));

    setContractDetails((current) => writeContractDetailsRoot(current, nextContracts));

    if (selectedContractIndex === 0 && "contractNumber" in updates) {
      setContractNumber(updates.contractNumber ?? "");
    }
  }, [contractDetails, contractNumber, selectedContractIndex]);

  const toggleInspectionTab = useCallback((tabId: InspectionTab, checked: boolean) => {
    setSelectedInspectionTabs((current) => {
      if (checked) {
        return current.includes(tabId) ? current : [...current, tabId];
      }

      return current.filter((item) => item !== tabId);
    });

    setActiveTab((current) => (!checked && current === tabId ? "contract" : current));
  }, []);

  const addInspectionSet = useCallback((tabId: InspectionTab) => {
    setInspectionSetCounts((current) => ({
      ...current,
      [tabId]: current[tabId] + 1
    }));
  }, []);

  const toggleChecklistItem = useCallback((tabId: InspectionTab, item: string, checked: boolean) => {
    setSelectedChecklistItems((current) => {
      const currentItems = current[tabId] ?? [];
      return {
        ...current,
        [tabId]: checked
          ? currentItems.includes(item) ? currentItems : [...currentItems, item]
          : currentItems.filter((currentItem) => currentItem !== item)
      };
    });
  }, []);

  const addCustomChecklistItem = useCallback((tabId: InspectionTab, sectionId: string, item: string) => {
    const trimmedItem = item.trim();

    if (!trimmedItem) {
      return;
    }

    setCustomChecklistItemsBySection((current) => {
      const currentSections = current[tabId] ?? {};
      const currentItems = currentSections[sectionId] ?? [];
      return {
        ...current,
        [tabId]: {
          ...currentSections,
          [sectionId]: currentItems.includes(trimmedItem) ? currentItems : [...currentItems, trimmedItem]
        }
      };
    });

    setSelectedChecklistItems((current) => {
      const currentItems = current[tabId] ?? [];
      return {
        ...current,
        [tabId]: currentItems.includes(trimmedItem) ? currentItems : [...currentItems, trimmedItem]
      };
    });
  }, []);

  const removeCustomChecklistItem = useCallback((tabId: InspectionTab, sectionId: string, item: string) => {
    setCustomChecklistItemsBySection((current) => {
      const currentSections = current[tabId] ?? {};

      return {
        ...current,
        [tabId]: {
          ...currentSections,
          [sectionId]: (currentSections[sectionId] ?? []).filter((currentItem) => currentItem !== item)
        }
      };
    });

    setSelectedChecklistItems((current) => ({
      ...current,
      [tabId]: (current[tabId] ?? []).filter((currentItem) => currentItem !== item)
    }));
  }, []);

  const updateCustomChecklistItem = useCallback((tabId: InspectionTab, sectionId: string, item: string, nextItem: string) => {
    const trimmedItem = nextItem.trim();

    if (!trimmedItem || trimmedItem === item) {
      return;
    }

    setCustomChecklistItemsBySection((current) => {
      const currentSections = current[tabId] ?? {};
      const currentItems = currentSections[sectionId] ?? [];

      if (currentItems.some((currentItem) => currentItem !== item && currentItem === trimmedItem)) {
        return current;
      }

      return {
        ...current,
        [tabId]: {
          ...currentSections,
          [sectionId]: currentItems.map((currentItem) => (currentItem === item ? trimmedItem : currentItem))
        }
      };
    });

    setSelectedChecklistItems((current) => {
      const nextItems = (current[tabId] ?? []).map((currentItem) => (currentItem === item ? trimmedItem : currentItem));
      return {
        ...current,
        [tabId]: Array.from(new Set(nextItems))
      };
    });
  }, []);

  const updateDefaultChecklistItem = useCallback((tabId: InspectionTab, sectionId: string, item: string, nextItem: string) => {
    const trimmedItem = nextItem.trim();

    if (!trimmedItem || trimmedItem === item) {
      return;
    }

    setItemLabelsBySection((current) => {
      const currentSections = current[tabId] ?? {};
      const currentItems = currentSections[sectionId] ?? {};

      return {
        ...current,
        [tabId]: {
          ...currentSections,
          [sectionId]: {
            ...currentItems,
            [item]: trimmedItem
          }
        }
      };
    });
  }, []);

  const updateDiagMonitorCount = useCallback((setId: number, count: 1 | 2) => {
    setDiagMonitorCounts((current) => ({
      ...current,
      [setId]: count
    }));
  }, []);

  const saveChecklistConfig = async () => {
    const checklistConfig: PmChecklistConfig = {
      customItems: {},
      customItemsBySection: customChecklistItemsBySection,
      diagMonitorCounts,
      itemLabelsBySection,
      selectedTabs: selectedInspectionTabs,
      setCounts: inspectionSetCounts,
      selectedItems: selectedChecklistItems
    };
    const normalizedContracts = normalizeContractItems(contractNumber, contractDetails).map((contract) => {
      const pmCycle = contract.pmCycle ?? "ครึ่งปี";
      const visitCount = getVisitCountForPmCycle(pmCycle);

      return {
        ...contract,
        pmCycle,
        visitCount: visitCount ? String(visitCount) : contract.visitCount,
        visitMonths: (contract.visitMonths ?? []).slice(0, visitCount || undefined)
      };
    });
    const normalizedContractDetailsWithList: SiteContractDetails = {
      ...writeContractDetailsRoot(contractDetails, normalizedContracts),
      checklistConfig
    };
    const normalizedContractNumber = normalizedContracts[0]?.contractNumber ?? contractNumber;

    writeSitePmChecklistConfig(site.id, checklistConfig);

    if (site.id) {
      const response = await fetch(`/api/sites/${encodeURIComponent(site.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contract: normalizedContractNumber,
          contractDetails: normalizedContractDetailsWithList,
          owner: selectedOwner
        })
      });
      const payload = await response.json() as { message?: string };

      if (!response.ok) {
        setSaveError(payload.message ?? "Cannot update site owner.");
        return;
      }
    }

    await onSaved();
    onClose();
  };

  const deleteSite = async () => {
    setIsDeleting(true);
    setSaveError("");

    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(site.id)}`, {
        method: "DELETE"
      });
      const payload = await response.json() as { message?: string };

      if (!response.ok) {
        setSaveError(payload.message ?? "Cannot delete site.");
        setIsDeleting(false);
        return;
      }

      await onSaved();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Cannot delete site.");
      setIsDeleting(false);
    }
  };

  const content = useMemo(() => {
    switch (activeTab) {
      case "customer":
        return (
          <CustomerTab
            contractCount={contractCount}
            site={site}
            regions={regions}
            selectedOwner={selectedOwner}
            systemUsers={systemUsers}
            onContractCountChange={updateContractCount}
            onOwnerChange={setSelectedOwner}
          />
        );
      case "contract":
        return (
          <ContractTab
            contract={selectedContract}
            contractCount={contractCount}
            selectedContractIndex={selectedContractIndex}
            onContractChange={updateSelectedContract}
            onSelectedContractIndexChange={setSelectedContractIndex}
            selectedInspectionTabs={selectedInspectionTabs}
            onToggleInspectionTab={toggleInspectionTab}
          />
        );
      case "synapse":
        return <SynapseTab customItemsBySection={customChecklistItemsBySection.synapse ?? {}} itemLabelsBySection={itemLabelsBySection.synapse ?? {}} setCount={inspectionSetCounts.synapse} selectedItems={selectedChecklistItems.synapse} onToggleItem={(item, checked) => toggleChecklistItem("synapse", item, checked)} onAddCustomItem={(sectionId, item) => addCustomChecklistItem("synapse", sectionId, item)} onRemoveCustomItem={(sectionId, item) => removeCustomChecklistItem("synapse", sectionId, item)} onUpdateCustomItem={(sectionId, item, nextItem) => updateCustomChecklistItem("synapse", sectionId, item, nextItem)} onUpdateDefaultItem={(sectionId, item, nextItem) => updateDefaultChecklistItem("synapse", sectionId, item, nextItem)} onAddSet={() => addInspectionSet("synapse")} />;
      case "server":
        return <DeviceTab title="SERVER" sectionId="serverChecklist" fields={["Location", "Manufacturer", "Host Name", "Model", "S/N or S/T", "IP Address", "ESX Version", "MT"]} checklistTitle="SERVER CHECKLIST" checklist={serverChecklist} addLabel={t("sites.addDeviceSet").replace("{device}", "Server")} customItemsBySection={customChecklistItemsBySection.server ?? {}} itemLabelsBySection={itemLabelsBySection.server ?? {}} setCount={inspectionSetCounts.server} selectedItems={selectedChecklistItems.server} onToggleItem={(item, checked) => toggleChecklistItem("server", item, checked)} onAddCustomItem={(sectionId, item) => addCustomChecklistItem("server", sectionId, item)} onRemoveCustomItem={(sectionId, item) => removeCustomChecklistItem("server", sectionId, item)} onUpdateCustomItem={(sectionId, item, nextItem) => updateCustomChecklistItem("server", sectionId, item, nextItem)} onUpdateDefaultItem={(sectionId, item, nextItem) => updateDefaultChecklistItem("server", sectionId, item, nextItem)} onAddSet={() => addInspectionSet("server")} />;
      case "switch":
        return <DeviceTab title="SWITCH" sectionId="switchChecklist" fields={["Customer Name", "Location", "Brand", "Model", "S/N", "Host Name", "IP Address"]} checklistTitle="SWITCH CHECKLIST" checklist={switchChecklist} addLabel={t("sites.addDeviceSet").replace("{device}", "Switch")} customItemsBySection={customChecklistItemsBySection.switch ?? {}} itemLabelsBySection={itemLabelsBySection.switch ?? {}} setCount={inspectionSetCounts.switch} selectedItems={selectedChecklistItems.switch} onToggleItem={(item, checked) => toggleChecklistItem("switch", item, checked)} onAddCustomItem={(sectionId, item) => addCustomChecklistItem("switch", sectionId, item)} onRemoveCustomItem={(sectionId, item) => removeCustomChecklistItem("switch", sectionId, item)} onUpdateCustomItem={(sectionId, item, nextItem) => updateCustomChecklistItem("switch", sectionId, item, nextItem)} onUpdateDefaultItem={(sectionId, item, nextItem) => updateDefaultChecklistItem("switch", sectionId, item, nextItem)} onAddSet={() => addInspectionSet("switch")} />;
      case "storage":
        return <DeviceTab title="STORAGE" sectionId="storageChecklist" fields={["Customer Name", "Location", "Model", "Manufacturer", "S/N or S/T", "MT"]} checklistTitle="STORAGE CHECKLIST" checklist={storageChecklist} addLabel={t("sites.addDeviceSet").replace("{device}", "Storage")} customItemsBySection={customChecklistItemsBySection.storage ?? {}} itemLabelsBySection={itemLabelsBySection.storage ?? {}} setCount={inspectionSetCounts.storage} selectedItems={selectedChecklistItems.storage} onToggleItem={(item, checked) => toggleChecklistItem("storage", item, checked)} onAddCustomItem={(sectionId, item) => addCustomChecklistItem("storage", sectionId, item)} onRemoveCustomItem={(sectionId, item) => removeCustomChecklistItem("storage", sectionId, item)} onUpdateCustomItem={(sectionId, item, nextItem) => updateCustomChecklistItem("storage", sectionId, item, nextItem)} onUpdateDefaultItem={(sectionId, item, nextItem) => updateDefaultChecklistItem("storage", sectionId, item, nextItem)} onAddSet={() => addInspectionSet("storage")} />;
      case "environment":
        return <EnvironmentTab customItemsBySection={customChecklistItemsBySection.environment ?? {}} itemLabelsBySection={itemLabelsBySection.environment ?? {}} setCount={inspectionSetCounts.environment} selectedItems={selectedChecklistItems.environment} onToggleItem={(item, checked) => toggleChecklistItem("environment", item, checked)} onAddCustomItem={(sectionId, item) => addCustomChecklistItem("environment", sectionId, item)} onRemoveCustomItem={(sectionId, item) => removeCustomChecklistItem("environment", sectionId, item)} onUpdateCustomItem={(sectionId, item, nextItem) => updateCustomChecklistItem("environment", sectionId, item, nextItem)} onUpdateDefaultItem={(sectionId, item, nextItem) => updateDefaultChecklistItem("environment", sectionId, item, nextItem)} onAddSet={() => addInspectionSet("environment")} />;
      case "diag":
        return <DiagTab monitorCounts={diagMonitorCounts} setCount={inspectionSetCounts.diag} onAddSet={() => addInspectionSet("diag")} onMonitorCountChange={updateDiagMonitorCount} />;
      default:
        return null;
    }
  }, [activeTab, addCustomChecklistItem, addInspectionSet, contractCount, customChecklistItemsBySection, diagMonitorCounts, inspectionSetCounts, itemLabelsBySection, regions, removeCustomChecklistItem, selectedChecklistItems, selectedContract, selectedContractIndex, selectedInspectionTabs, selectedOwner, site, systemUsers, t, toggleChecklistItem, toggleInspectionTab, updateContractCount, updateCustomChecklistItem, updateDefaultChecklistItem, updateDiagMonitorCount, updateSelectedContract]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <article className="modal">
        <header className="modalHeader">
          <h2>
            <Building2 size={17} />
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </header>

        <nav className="tabs" aria-label="Site form tabs">
          {visibleTabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "activeTab" : "tab"}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.labelKey ? t(tab.labelKey) : tab.label}
            </button>
          ))}
        </nav>

        <div className="modalBody">{content}</div>
        <AlertPopup open={Boolean(saveError)} tone="error" message={saveError} onClose={() => setSaveError("")} />

        <footer className="modalFooter">
          <div className="modalFooterActions">
            <button className="button ghost" type="button" onClick={onClose}>{t("common.cancel")}</button>
            {mode === "edit" && (
              <button
                className="button danger"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 size={16} />
                {t("sites.deleteSite")}
              </button>
            )}
          </div>
          <button className="button primary" type="button" onClick={saveChecklistConfig} disabled={isDeleting}>
            <Save size={16} />
            {t("sites.saveSite")}
          </button>
        </footer>

        {showDeleteConfirm && (
          <div className="confirmOverlay" role="alertdialog" aria-modal="true" aria-label={t("sites.deleteModalTitle")}>
            <button className="confirmBackdrop" type="button" aria-label={t("common.cancel")} onClick={() => setShowDeleteConfirm(false)} />
            <article className="confirmDialog">
              <h3>{t("sites.deleteModalTitle")}</h3>
              <p>{t("sites.deleteConfirmMessage").replace("{site}", site.site)}</p>
              <div className="confirmActions">
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="button danger"
                  type="button"
                  onClick={deleteSite}
                  disabled={isDeleting}
                >
                  {isDeleting ? t("sites.deletingSite") : t("sites.deleteSite")}
                </button>
              </div>
            </article>
          </div>
        )}
      </article>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}

function CustomerTab({
  contractCount,
  site,
  regions,
  selectedOwner,
  systemUsers,
  onContractCountChange,
  onOwnerChange
}: {
  contractCount: number;
  site: SiteCatalogRecord;
  regions: string[];
  selectedOwner: string;
  systemUsers: SystemUser[];
  onContractCountChange: (count: number) => void;
  onOwnerChange: (owner: string) => void;
}) {
  const { t } = useUi();
  const ownerExists = systemUsers.some((user) => user.name === selectedOwner);

  return (
    <div className="tabPane">
      <div className="formGrid">
        <Field label={`${t("fields.siteName")} *`} value={site.site} />
        <Field label={`${t("fields.customerName")} *`} value={site.customer} />
        <Field label={t("fields.contactName")} value={site.contact} />
        <Field label={t("fields.department")} value={site.department} />
        <Field label={t("fields.phone")} value={site.phone} />
        <Field label={t("fields.email")} value={site.email} />
        <label className="label">
          จำนวนสัญญา
          <select className="select" value={contractCount} onChange={(event) => onContractCountChange(Number(event.target.value))}>
            {contractCountOptions.map((count) => (
              <option key={count} value={count}>{count} สัญญา</option>
            ))}
          </select>
        </label>
        <Field label={t("common.province")} value={site.province} />
        <label className="label">
          {t("fields.regionArea")}
          <select className="select" defaultValue={site.region}>
            <option>{t("fields.selectRegion")}</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>
        <label className="label">
          {t("fields.siteOwner")}
          <select className="select" value={ownerExists ? selectedOwner : ""} onChange={(event) => onOwnerChange(event.target.value)}>
            <option value="" disabled>{t("fields.siteOwner")}</option>
            {systemUsers.map((user) => (
              <option key={user.id} value={user.name}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <Field label={t("fields.latitude")} value="13.7563" />
        <Field label={t("fields.longitude")} value="100.5018" />
      </div>
    </div>
  );
}

function ContractTab({
  contract,
  contractCount,
  selectedContractIndex,
  onContractChange,
  onSelectedContractIndexChange,
  selectedInspectionTabs,
  onToggleInspectionTab
}: {
  contract: SiteContractItem;
  contractCount: number;
  selectedContractIndex: number;
  onContractChange: (updates: Partial<SiteContractItem>) => void;
  onSelectedContractIndexChange: (index: number) => void;
  selectedInspectionTabs: InspectionTab[];
  onToggleInspectionTab: (tabId: InspectionTab, checked: boolean) => void;
}) {
  const { lang, t } = useUi();
  const selectedVisitMonths = Array.isArray(contract.visitMonths) ? contract.visitMonths : [];
  const selectedPmCycle = contract.pmCycle ?? "ครึ่งปี";
  const visitLimit = getVisitCountForPmCycle(selectedPmCycle);
  const visitLimitLabel = lang === "th" ? `เลือกได้ ${selectedVisitMonths.length}/${visitLimit} เดือน` : `${selectedVisitMonths.length}/${visitLimit} months selected`;
  const availableVisitMonths = monthOptions.filter((month) => !selectedVisitMonths.includes(month.value));
  const orderedSelectedVisitMonths = monthOptions.filter((month) => selectedVisitMonths.includes(month.value));
  const canAddVisitMonth = visitLimit > selectedVisitMonths.length && availableVisitMonths.length > 0;
  const updateContractDetails = <K extends keyof SiteContractItem>(field: K, value: SiteContractItem[K]) => {
    onContractChange({ [field]: value } as Partial<SiteContractItem>);
  };
  const updatePmCycle = (value: string) => {
    const nextVisitCount = getVisitCountForPmCycle(value);

    onContractChange({
      pmCycle: value,
      visitCount: nextVisitCount ? String(nextVisitCount) : "",
      visitMonths: selectedVisitMonths.slice(0, nextVisitCount || undefined)
    });
  };
  const addVisitMonth = (month: string) => {
    if (!month || selectedVisitMonths.includes(month) || selectedVisitMonths.length >= visitLimit) {
      return;
    }

    updateContractDetails("visitMonths", [...selectedVisitMonths, month]);
  };
  const removeVisitMonth = (month: string) => {
    updateContractDetails("visitMonths", selectedVisitMonths.filter((item) => item !== month));
  };
  const contractStartDate = contract.contractStartDate ?? "";
  const contractEndDate = contract.contractEndDate ?? "";

  return (
    <div className="tabPane">
      <div className="formGrid">
        <label className="label">
          เลือกสัญญา
          <select className="select" value={selectedContractIndex} onChange={(event) => onSelectedContractIndexChange(Number(event.target.value))}>
            {Array.from({ length: contractCount }, (_, index) => (
              <option key={index} value={index}>สัญญา {index + 1}</option>
            ))}
          </select>
        </label>
        <label className="label">
          {t("fields.pmCycle")}
          <select
            className="select"
            value={selectedPmCycle}
            onChange={(event) => updatePmCycle(event.target.value)}
          >
            {["รายเดือน", "ราย3เดือน", "ราย4เดือน", "ครึ่งปี", "รายปี"].map((cycle) => (
              <option key={cycle} value={cycle}>{localizeLabel(cycle, lang)}</option>
            ))}
          </select>
        </label>
        <label className="label">
          {t("fields.contractNumber")}
          <input className="field" value={contract.contractNumber ?? ""} placeholder={t("fields.contractNumber")} onChange={(event) => updateContractDetails("contractNumber", event.target.value)} />
        </label>
        <label className="label">
          ชื่อโครงการ
          <input className="field" value={contract.projectName ?? ""} placeholder="ชื่อโครงการ" onChange={(event) => updateContractDetails("projectName", event.target.value)} />
        </label>
        {/* <label className="label">
          {t("fields.visitCount")}
          <input className="field" min={0} max={12} readOnly type="number" value={visitLimit || ""} placeholder={t("fields.visitCount")} />
        </label> */}
        <label className="label">
          {t("fields.contractStartDate")}
          <input className="field" type="date" value={contractStartDate} onChange={(event) => updateContractDetails("contractStartDate", event.target.value)} />
        </label>
        <label className="label">
          {t("fields.contractEndDate")}
          <input className="field" type="date" value={contractEndDate} onChange={(event) => updateContractDetails("contractEndDate", event.target.value)} />
        </label>
      </div>

      <section className="sectionCard">
        <div className="sectionTitleRow">
          <h3>{t("sites.visitMonths")}</h3>
          <span>{visitLimitLabel}</span>
        </div>
        <select className="select" value="" disabled={!canAddVisitMonth} onChange={(event) => addVisitMonth(event.target.value)}>
          <option value="">{t("sites.selectVisitMonth")}</option>
          {availableVisitMonths.map((month) => (
            <option key={month.value} value={month.value}>{lang === "th" ? month.th : month.en}</option>
          ))}
        </select>
        {orderedSelectedVisitMonths.length > 0 ? (
          <div className="visitMonthChips">
            {orderedSelectedVisitMonths.map((month) => (
              <span key={month.value}>
                {lang === "th" ? month.th : month.en}
                <button type="button" aria-label={`${t("sites.removeVisitMonth")} ${lang === "th" ? month.th : month.en}`} onClick={() => removeVisitMonth(month.value)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <label className="uploadBox">
        <span>{t("sites.attachContract")}</span>
        <strong>
          <Upload size={16} />
          {t("sites.uploadPdf")}
        </strong>
        <input type="file" accept="application/pdf" />
      </label>

      <label className="label">
        {t("fields.contractNote")}
        <textarea className="textarea" value={contract.contractNote ?? ""} onChange={(event) => updateContractDetails("contractNote", event.target.value)} />
      </label>

      <section className="sectionCard">
        <h3>{t("sites.inspectionCategories")}</h3>
        <div className="checkCategoryGrid">
          {inspectionTabs.map((item) => (
            <CheckItem
              key={item.id}
              label={item.labelKey ? t(item.labelKey) : item.label}
              checked={selectedInspectionTabs.includes(item.id)}
              onChange={(checked) => onToggleInspectionTab(item.id, checked)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SynapseTab({
  customItemsBySection,
  itemLabelsBySection,
  setCount,
  selectedItems,
  onToggleItem,
  onAddCustomItem,
  onRemoveCustomItem,
  onUpdateCustomItem,
  onUpdateDefaultItem,
  onAddSet
}: {
  customItemsBySection: Record<string, string[]>;
  itemLabelsBySection: Record<string, Record<string, string>>;
  setCount: number;
  selectedItems: string[];
  onToggleItem: (item: string, checked: boolean) => void;
  onAddCustomItem: (sectionId: string, item: string) => void;
  onRemoveCustomItem: (sectionId: string, item: string) => void;
  onUpdateCustomItem: (sectionId: string, item: string, nextItem: string) => void;
  onUpdateDefaultItem: (sectionId: string, item: string, nextItem: string) => void;
  onAddSet: () => void;
}) {
  const { t } = useUi();

  return (
    <div className="tabPane">
      {Array.from({ length: setCount }, (_, index) => index + 1).map((setId) => (
        <SynapseSetPanel key={setId} customItemsBySection={customItemsBySection} itemLabelsBySection={itemLabelsBySection} setId={setId} selectedItems={selectedItems} onAddCustomItem={onAddCustomItem} onRemoveCustomItem={onRemoveCustomItem} onUpdateCustomItem={onUpdateCustomItem} onUpdateDefaultItem={onUpdateDefaultItem} onToggleItem={onToggleItem} />
      ))}
      <button className="addLineButton" type="button" onClick={onAddSet}>
        <Plus size={15} />
        {t("sites.addSynapseSet")}
      </button>
    </div>
  );
}

function SynapseSetPanel({
  customItemsBySection,
  itemLabelsBySection,
  setId,
  selectedItems,
  onAddCustomItem,
  onRemoveCustomItem,
  onUpdateCustomItem,
  onUpdateDefaultItem,
  onToggleItem
}: {
  customItemsBySection: Record<string, string[]>;
  itemLabelsBySection: Record<string, Record<string, string>>;
  setId: number;
  selectedItems: string[];
  onAddCustomItem: (sectionId: string, item: string) => void;
  onRemoveCustomItem: (sectionId: string, item: string) => void;
  onUpdateCustomItem: (sectionId: string, item: string, nextItem: string) => void;
  onUpdateDefaultItem: (sectionId: string, item: string, nextItem: string) => void;
  onToggleItem: (item: string, checked: boolean) => void;
}) {
  return (
    <>
      <section className="sectionCard">
        <h3>CUSTOMER INFORMATION #{setId}</h3>
        <div className="formGrid">
          <Field label="Customer Name" placeholder="Customer Name" />
          <Field label="Synapse Version" placeholder="Synapse Version" />
          <Field label="Host Name" placeholder="Host Name" />
          <Field label="License Studies" placeholder="License Studies" />
          <Field label="Current Studies Per Year" placeholder="Current Studies Per Year" />
          <Field label="Antivirus Definition Date" placeholder="DD/MM/YYYY" />
        </div>
      </section>

      <section className="sectionCard">
        <h3>FREE SPACE (GB)</h3>
        <div className="quadGrid">
          {["Database O: Free (GB)", "Database O: Total (GB)", "Warm DB Free (GB)", "Warm DB Total (GB)"].map((item) => (
            <Field key={item} label={item} placeholder={item} />
          ))}
        </div>
      </section>

      <ChecklistSection customItems={customItemsBySection.synapseSystem ?? []} itemLabels={itemLabelsBySection.synapseSystem ?? {}} title={`SYNAPSE SYSTEM CHECKLIST #${setId}`} items={synapseSystem} selectedItems={selectedItems} onAddItem={(item) => onAddCustomItem("synapseSystem", item)} onRemoveItem={(item) => onRemoveCustomItem("synapseSystem", item)} onUpdateItem={(item, nextItem) => onUpdateCustomItem("synapseSystem", item, nextItem)} onUpdateDefaultItem={(item, nextItem) => onUpdateDefaultItem("synapseSystem", item, nextItem)} onToggleItem={onToggleItem} />
      <ChecklistSection customItems={customItemsBySection.configurationBackup ?? []} itemLabels={itemLabelsBySection.configurationBackup ?? {}} title={`CONFIGURATION BACKUP CHECKLIST #${setId}`} items={configurationBackup} selectedItems={selectedItems} onAddItem={(item) => onAddCustomItem("configurationBackup", item)} onRemoveItem={(item) => onRemoveCustomItem("configurationBackup", item)} onUpdateItem={(item, nextItem) => onUpdateCustomItem("configurationBackup", item, nextItem)} onUpdateDefaultItem={(item, nextItem) => onUpdateDefaultItem("configurationBackup", item, nextItem)} onToggleItem={onToggleItem} />
      <Field label="Configuration Backup Path" placeholder="Configuration Backup Path" />

      <section className="sectionCard">
        <h3>BACKUP DEVICE / DATA BACKUP CHECKING #{setId}</h3>
        <RadioGroup label={`Backup Type ${setId}`} items={["DR Site", "NAS", "Other"]} />
        <Field label="Location" placeholder="Location" />
        <RadioGroup label={`Hardware Status ${setId}`} items={["ปกติ", "ผิดปกติ"]} />
        <RadioGroup label={`Backup Status ${setId}`} items={["ปกติ", "ผิดปกติ"]} />
        <Field label="Running Date" placeholder="DD/MM/YYYY" />
      </section>
    </>
  );
}

function DeviceTab({
  title,
  sectionId,
  fields,
  checklistTitle,
  checklist,
  addLabel,
  customItemsBySection,
  itemLabelsBySection,
  setCount,
  selectedItems,
  onToggleItem,
  onAddCustomItem,
  onRemoveCustomItem,
  onUpdateCustomItem,
  onUpdateDefaultItem,
  onAddSet
}: {
  title: string;
  sectionId: string;
  fields: string[];
  checklistTitle: string;
  checklist: string[];
  addLabel: string;
  customItemsBySection: Record<string, string[]>;
  itemLabelsBySection: Record<string, Record<string, string>>;
  setCount: number;
  selectedItems: string[];
  onToggleItem: (item: string, checked: boolean) => void;
  onAddCustomItem: (sectionId: string, item: string) => void;
  onRemoveCustomItem: (sectionId: string, item: string) => void;
  onUpdateCustomItem: (sectionId: string, item: string, nextItem: string) => void;
  onUpdateDefaultItem: (sectionId: string, item: string, nextItem: string) => void;
  onAddSet: () => void;
}) {
  return (
    <div className="tabPane">
      {Array.from({ length: setCount }, (_, index) => index + 1).map((setId) => (
        <section className="sectionCard" key={setId}>
          <h3>{title} #{setId}</h3>
          <div className="formGrid">
            {fields.map((field) => (
              <Field key={field} label={field} placeholder={field} />
            ))}
          </div>
          <ChecklistSection customItems={customItemsBySection[sectionId] ?? []} itemLabels={itemLabelsBySection[sectionId] ?? {}} title={`${checklistTitle} #${setId}`} items={checklist} selectedItems={selectedItems} onAddItem={(item) => onAddCustomItem(sectionId, item)} onRemoveItem={(item) => onRemoveCustomItem(sectionId, item)} onUpdateItem={(item, nextItem) => onUpdateCustomItem(sectionId, item, nextItem)} onUpdateDefaultItem={(item, nextItem) => onUpdateDefaultItem(sectionId, item, nextItem)} onToggleItem={onToggleItem} />
        </section>
      ))}
      <button className="addLineButton" type="button" onClick={onAddSet}>
        <Plus size={15} />
        {addLabel}
      </button>
    </div>
  );
}

function EnvironmentTab({
  customItemsBySection,
  itemLabelsBySection,
  setCount,
  selectedItems,
  onToggleItem,
  onAddCustomItem,
  onRemoveCustomItem,
  onUpdateCustomItem,
  onUpdateDefaultItem,
  onAddSet
}: {
  customItemsBySection: Record<string, string[]>;
  itemLabelsBySection: Record<string, Record<string, string>>;
  setCount: number;
  selectedItems: string[];
  onToggleItem: (item: string, checked: boolean) => void;
  onAddCustomItem: (sectionId: string, item: string) => void;
  onRemoveCustomItem: (sectionId: string, item: string) => void;
  onUpdateCustomItem: (sectionId: string, item: string, nextItem: string) => void;
  onUpdateDefaultItem: (sectionId: string, item: string, nextItem: string) => void;
  onAddSet: () => void;
}) {
  const { t } = useUi();

  return (
    <div className="tabPane">
      {Array.from({ length: setCount }, (_, index) => index + 1).map((setId) => (
        <EnvironmentSetPanel key={setId} customItemsBySection={customItemsBySection} itemLabelsBySection={itemLabelsBySection} setId={setId} selectedItems={selectedItems} onAddCustomItem={onAddCustomItem} onRemoveCustomItem={onRemoveCustomItem} onUpdateCustomItem={onUpdateCustomItem} onUpdateDefaultItem={onUpdateDefaultItem} onToggleItem={onToggleItem} />
      ))}
      <button className="addLineButton" type="button" onClick={onAddSet}>
        <Plus size={15} />
        {t("sites.addEnvironmentSet")}
      </button>
    </div>
  );
}

function EnvironmentSetPanel({
  customItemsBySection,
  itemLabelsBySection,
  setId,
  selectedItems,
  onAddCustomItem,
  onRemoveCustomItem,
  onUpdateCustomItem,
  onUpdateDefaultItem,
  onToggleItem
}: {
  customItemsBySection: Record<string, string[]>;
  itemLabelsBySection: Record<string, Record<string, string>>;
  setId: number;
  selectedItems: string[];
  onAddCustomItem: (sectionId: string, item: string) => void;
  onRemoveCustomItem: (sectionId: string, item: string) => void;
  onUpdateCustomItem: (sectionId: string, item: string, nextItem: string) => void;
  onUpdateDefaultItem: (sectionId: string, item: string, nextItem: string) => void;
  onToggleItem: (item: string, checked: boolean) => void;
}) {
  const { t } = useUi();

  return (
    <>
      <section className="sectionCard">
        <h3>CUSTOMER INFORMATION #{setId}</h3>
        <div className="formGrid">
          <Field label="Customer Name" placeholder="Customer Name" />
          <Field label="Location" placeholder="Location" />
        </div>
      </section>
      <ChecklistSection customItems={customItemsBySection.environmentMain ?? []} itemLabels={itemLabelsBySection.environmentMain ?? {}} title={`${t("sites.environmentChecklist")} #${setId}`} items={environmentMain} selectedItems={selectedItems} onAddItem={(item) => onAddCustomItem("environmentMain", item)} onRemoveItem={(item) => onRemoveCustomItem("environmentMain", item)} onUpdateItem={(item, nextItem) => onUpdateCustomItem("environmentMain", item, nextItem)} onUpdateDefaultItem={(item, nextItem) => onUpdateDefaultItem("environmentMain", item, nextItem)} onToggleItem={onToggleItem} />
      <ChecklistSection customItems={customItemsBySection.environmentPower ?? []} itemLabels={itemLabelsBySection.environmentPower ?? {}} title={`${t("sites.cablingPowerChecklist")} #${setId}`} items={environmentPower} selectedItems={selectedItems} onAddItem={(item) => onAddCustomItem("environmentPower", item)} onRemoveItem={(item) => onRemoveCustomItem("environmentPower", item)} onUpdateItem={(item, nextItem) => onUpdateCustomItem("environmentPower", item, nextItem)} onUpdateDefaultItem={(item, nextItem) => onUpdateDefaultItem("environmentPower", item, nextItem)} onToggleItem={onToggleItem} />
      <ChecklistSection customItems={customItemsBySection.environmentSecurity ?? []} itemLabels={itemLabelsBySection.environmentSecurity ?? {}} title={`SECURITY CHECKLIST #${setId}`} items={environmentSecurity} selectedItems={selectedItems} onAddItem={(item) => onAddCustomItem("environmentSecurity", item)} onRemoveItem={(item) => onRemoveCustomItem("environmentSecurity", item)} onUpdateItem={(item, nextItem) => onUpdateCustomItem("environmentSecurity", item, nextItem)} onUpdateDefaultItem={(item, nextItem) => onUpdateDefaultItem("environmentSecurity", item, nextItem)} onToggleItem={onToggleItem} />
    </>
  );
}

function DiagTab({
  monitorCounts,
  setCount,
  onAddSet,
  onMonitorCountChange
}: {
  monitorCounts: Record<number, 1 | 2>;
  setCount: number;
  onAddSet: () => void;
  onMonitorCountChange: (setId: number, count: 1 | 2) => void;
}) {
  const { t } = useUi();
  const [diagRowsBySet, setDiagRowsBySet] = useState<Record<number, DiagSet["rows"]>>({});
  const diagSets = useMemo(() => (
    Array.from({ length: setCount }, (_, index) => {
      const id = index + 1;
      return {
        id,
        rows: diagRowsBySet[id] ?? createDiagSet(id).rows
      };
    })
  ), [diagRowsBySet, setCount]);

  const toggleDiagCheck = (setId: number, device: string, check: DiagCheck) => {
    setDiagRowsBySet((current) => {
      const rows = current[setId] ?? createDiagSet(setId).rows;
      const deviceValues = rows[device] ?? defaultDiagValues;

      return {
        ...current,
        [setId]: {
          ...rows,
          [device]: {
            ...deviceValues,
            [check]: !deviceValues[check]
          }
        }
      };
    });
  };

  return (
    <div className="tabPane">
      {diagSets.map((diagSet) => (
        <DiagSetPanel
          key={diagSet.id}
          diagSet={diagSet}
          monitorCount={monitorCounts[diagSet.id] ?? 2}
          onToggle={toggleDiagCheck}
          onMonitorCountChange={onMonitorCountChange}
        />
      ))}

      <button className="addLineButton" type="button" onClick={onAddSet}>
        <Plus size={15} />
        {t("sites.addDiagSet")}
      </button>
    </div>
  );
}

function DiagSetPanel({
  diagSet,
  monitorCount,
  onMonitorCountChange,
  onToggle
}: {
  diagSet: DiagSet;
  monitorCount: 1 | 2;
  onMonitorCountChange: (setId: number, count: 1 | 2) => void;
  onToggle: (setId: number, device: string, check: DiagCheck) => void;
}) {
  const { t } = useUi();
  const physicalStatusFields = [
    "Act. Times Monitor 1",
    ...(monitorCount === 2 ? ["Act. Times Monitor 2"] : []),
    "Backlight Times Monitor 1",
    ...(monitorCount === 2 ? ["Backlight Times Monitor 2"] : []),
    "Mfg Date Monitor 1",
    ...(monitorCount === 2 ? ["Mfg Date Monitor 2"] : [])
  ];

  return (
    <>
      <section className="sectionCard">
        <h3>{t("sites.diagSetTitle")} #{diagSet.id}</h3>
        <div className="formGrid">
          {["Customer Name", "Location", "Brand", "Model", "S/N", "IP Address", "OS"].map((field) => (
            <Field key={field} label={field} placeholder={field} />
          ))}
          <label className="label">
            {t("sites.monitorCount")}
            <select className="select" value={monitorCount} onChange={(event) => onMonitorCountChange(diagSet.id, Number(event.target.value) === 1 ? 1 : 2)}>
              <option value={1}>1 Monitor</option>
              <option value={2}>2 Monitor</option>
            </select>
          </label>
        </div>
        <RadioGroup label={`Antivirus ${diagSet.id}`} items={["Installed", "No Installation"]} />
        <Field label="Definition Date" placeholder="DD/MM/YYYY" />
      </section>

      <Calibrate title={`Calibrate: Monitor 1 - DIAG #${diagSet.id}`} />
      {monitorCount === 2 ? <Calibrate title={`Calibrate: Monitor 2 - DIAG #${diagSet.id}`} /> : null}

      <section className="sectionCard">
        <RadioGroup label={`Diagnostic Monitor / SMPTE Pattern ${diagSet.id}`} items={["ปกติ", "ผิดปกติ"]} />
        <h3>{monitorCount === 1 ? "Physical Status 1" : "Physical Status"}</h3>
        <div className="formGrid">
          {physicalStatusFields.map((field) => (
            <Field key={field} label={field} placeholder={field.includes("Date") ? "DD/MM/YYYY" : field} />
          ))}
        </div>
      </section>

      <section className="sectionCard">
        <h3>{t("sites.deviceInspectionList")}</h3>
        <div className="deviceTable">
          <span className="tableHeader">{t("pm.device")}</span>
          <span className="tableHeader">Cleaning</span>
          <span className="tableHeader">Availability</span>
          <span className="tableHeader">Abnormal</span>
          <span className="tableHeader">Repaired</span>
          {diagDevices.map((device) => (
            <DiagRow
              key={device}
              device={device}
              values={diagSet.rows[device]}
              onToggle={(check) => onToggle(diagSet.id, device, check)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function Calibrate({ title }: { title: string }) {
  return (
    <section className="sectionCard">
      <h3>{title}</h3>
      <div className="tripleGrid">
        {["Brand / Model", "S/N", "Target Min (cd/m²)", "Target Max (cd/m²)", "Result Min (cd/m²)", "Result Max (cd/m²)"].map((field) => (
          <Field key={field} label={field} placeholder={field} />
        ))}
      </div>
      <RadioGroup label="Calibrate Status" items={["ปกติ", "ผิดปกติ"]} />
    </section>
  );
}

function DiagRow({
  device,
  values,
  onToggle
}: {
  device: string;
  values: Record<DiagCheck, boolean>;
  onToggle: (check: DiagCheck) => void;
}) {
  return (
    <>
      <strong className="deviceName">{device}</strong>
      {diagChecks.map((check) => (
        <CheckDot
          key={check}
          checked={values[check]}
          label={`${device} ${check}`}
          onToggle={() => onToggle(check)}
        />
      ))}
    </>
  );
}

function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  const { lang } = useUi();
  const localizedLabel = localizeLabel(label, lang);
  const localizedPlaceholder = localizeLabel(placeholder ?? label, lang);

  return (
    <label className="label">
      {localizedLabel}
      <input className="field" defaultValue={value} placeholder={localizedPlaceholder} />
    </label>
  );
}

function ChecklistSection({
  customItems = [],
  itemLabels = {},
  title,
  items,
  selectedItems,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateDefaultItem,
  onToggleItem
}: {
  customItems?: string[];
  itemLabels?: Record<string, string>;
  title: string;
  items: string[];
  selectedItems?: string[];
  onAddItem?: (item: string) => void;
  onRemoveItem?: (item: string) => void;
  onUpdateItem?: (item: string, nextItem: string) => void;
  onUpdateDefaultItem?: (item: string, nextItem: string) => void;
  onToggleItem?: (item: string, checked: boolean) => void;
}) {
  const { lang, t } = useUi();
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [editingItem, setEditingItem] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const allDisplayItems = [...items.map((item) => itemLabels[item] ?? item), ...customItems];
  const isDefaultEditingItem = items.includes(editingItem);
  const addItem = () => {
    const trimmedItem = newItem.trim();

    if (!trimmedItem) {
      return;
    }

    if (allDisplayItems.includes(trimmedItem)) {
      setNewItem("");
      setIsAdding(false);
      return;
    }

    onAddItem?.(trimmedItem);
    setNewItem("");
    setIsAdding(false);
  };
  const startEditing = (item: string) => {
    setEditingItem(item);
    setEditingValue(itemLabels[item] ?? item);
    setIsAdding(false);
  };
  const confirmEdit = () => {
    const trimmedItem = editingValue.trim();

    if (!editingItem || !trimmedItem || (trimmedItem !== (itemLabels[editingItem] ?? editingItem) && allDisplayItems.includes(trimmedItem))) {
      return;
    }

    if (isDefaultEditingItem) {
      onUpdateDefaultItem?.(editingItem, trimmedItem);
    } else {
      onUpdateItem?.(editingItem, trimmedItem);
    }

    setEditingItem("");
    setEditingValue("");
  };
  const deleteEditingItem = () => {
    if (!editingItem) {
      return;
    }

    if (isDefaultEditingItem) {
      setEditingItem("");
      setEditingValue("");
      return;
    }

    onRemoveItem?.(editingItem);
    setEditingItem("");
    setEditingValue("");
  };

  return (
    <section className="sectionCard">
      <div className="checklistHeader">
        <h3>{localizeLabel(title, lang)}</h3>
        {onAddItem ? (
          <button className="checklistAddButton" type="button" onClick={() => setIsAdding((current) => !current)} aria-label={t("sites.addChecklistItem")}>
            <Plus size={14} />
          </button>
        ) : null}
      </div>
      {isAdding ? (
        <div className="inlineChecklistForm">
          <input
            className="field"
            value={newItem}
            placeholder={t("sites.addChecklistItem")}
            onChange={(event) => setNewItem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addItem();
              }
            }}
          />
          <button className="button subtle" type="button" onClick={addItem}>{t("common.add")}</button>
        </div>
      ) : null}
      <div className="checkList">
        {items.map((item) => (
          <div className="checkItemWithAction" key={item}>
            {editingItem === item ? (
              <div className="checkItemEditRow">
                <input
                  className="field"
                  value={editingValue}
                  onChange={(event) => setEditingValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmEdit();
                    }
                  }}
                />
                <button className="iconButton confirmChecklistButton" type="button" onClick={confirmEdit} aria-label={`${t("sites.confirmChecklistItem")} ${itemLabels[item] ?? item}`}>
                  <Check size={14} />
                </button>
                <button className="iconButton deleteChecklistButton" type="button" onClick={deleteEditingItem} aria-label={`${t("common.cancel")} ${itemLabels[item] ?? item}`}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <CheckItem
                  label={itemLabels[item] ?? item}
                  checked={selectedItems?.includes(item)}
                  onChange={onToggleItem ? (checked) => onToggleItem(item, checked) : undefined}
                />
                {onUpdateDefaultItem ? (
                  <button className="iconButton" type="button" onClick={() => startEditing(item)} aria-label={`${t("sites.editChecklistItem")} ${itemLabels[item] ?? item}`}>
                    <Pencil size={14} />
                  </button>
                ) : null}
              </>
            )}
          </div>
        ))}
        {customItems.map((item) => (
          <div className="checkItemWithAction" key={item}>
            {editingItem === item ? (
              <div className="checkItemEditRow">
                <input
                  className="field"
                  value={editingValue}
                  onChange={(event) => setEditingValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmEdit();
                    }
                  }}
                />
                <button className="iconButton confirmChecklistButton" type="button" onClick={confirmEdit} aria-label={`${t("sites.confirmChecklistItem")} ${item}`}>
                  <Check size={14} />
                </button>
                <button className="iconButton deleteChecklistButton" type="button" onClick={deleteEditingItem} aria-label={`${t("sites.deleteChecklistItem")} ${item}`}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <CheckItem
                  label={item}
                  checked={selectedItems?.includes(item)}
                  onChange={onToggleItem ? (checked) => onToggleItem(item, checked) : undefined}
                />
                {onUpdateItem ? (
                  <button className="iconButton" type="button" onClick={() => startEditing(item)} aria-label={`${t("sites.editChecklistItem")} ${item}`}>
                    <Pencil size={14} />
                  </button>
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CheckItem({
  label,
  checked,
  onChange
}: {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const { lang } = useUi();

  return (
    <label className="checkItem">
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={checked === undefined ? true : undefined}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span>
        <Check size={12} />
      </span>
      <strong>{localizeLabel(label, lang)}</strong>
    </label>
  );
}

function CheckDot({
  checked = false,
  label,
  onToggle
}: {
  checked?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <span className="dotCell">
      <button
        className={checked ? "checkedDot" : "emptyDot"}
        type="button"
        aria-label={label}
        aria-pressed={checked}
        onClick={onToggle}
      >
        {checked ? <Check size={11} /> : null}
      </button>
    </span>
  );
}

function RadioGroup({ label, items }: { label: string; items: string[] }) {
  const { lang } = useUi();

  return (
    <div className="radioGroup">
      <strong>{localizeLabel(label, lang)}</strong>
      <div>
        {items.map((item, index) => (
          <label key={item}>
            <input name={`${label}-${item}`} type="radio" defaultChecked={index === 0} />
            <span />
            {localizeLabel(item, lang)}
          </label>
        ))}
      </div>
    </div>
  );
}
