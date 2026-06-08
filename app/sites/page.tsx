"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  Plus,
  Save,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
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
import { regions, siteCatalog as sites, type SiteCatalogRecord } from "@/lib/mock-data";

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

function resolveSelectedChecklistItems(config: PmChecklistConfig): Record<InspectionTab, string[]> {
  return inspectionTabs.reduce((items, tab) => {
    const defaultItems = checklistItemsByInspectionTab[tab.id];
    const savedItems = config.selectedItems[tab.id];
    items[tab.id] = savedItems ? defaultItems.filter((item) => savedItems.includes(item)) : defaultItems;
    return items;
  }, {} as Record<InspectionTab, string[]>);
}

export default function SitesPage() {
  const { t } = useUi();
  const [modalSite, setModalSite] = useState<SiteCatalogRecord | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [siteStatusFilter, setSiteStatusFilter] = useState("");

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sites.filter((site) => {
      const searchableText = `${site.site} ${site.customer} ${site.province} ${site.owner} ${site.phone}`.toLowerCase();
      const matchesQuery = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      const matchesRegion = regionFilter ? site.region === regionFilter : true;
      const matchesStatus = siteStatusFilter ? siteStatusFilter === "active" : true;

      return matchesQuery && matchesRegion && matchesStatus;
    });
  }, [query, regionFilter, siteStatusFilter]);

  const openAdd = () => {
    setModalMode("add");
    setModalSite(sites[0]);
  };

  const openEdit = (site: SiteCatalogRecord) => {
    setModalMode("edit");
    setModalSite(site);
  };

  return (
    <AppShell>
      <div className="sitesPage">
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
        {filteredSites.length > 0 ? filteredSites.map((site) => (
          <button className="siteRow" key={site.id} type="button" onClick={() => openEdit(site)}>
            <div>
              <strong>{site.site}</strong>
              <span className="statusPill success">{t("common.active")}</span>
            </div>
            <small>
              <UserRound size={13} /> {site.customer}
              <span>{t("common.phonePrefix")} {site.phone}</span>
              <span>{t("common.provincePrefix")} {site.province}</span>
              <span>{t("common.ownerPrefix")}: {site.owner}</span>
            </small>
            <ChevronRight size={18} />
          </button>
        )) : <EmptyState message={t("sites.noSites")} />}
      </section>

      {modalSite ? (
        <SiteModal
          mode={modalMode}
          site={modalSite}
          onClose={() => setModalSite(null)}
        />
      ) : null}
      </div>
    </AppShell>
  );
}

function SiteModal({
  mode,
  site,
  onClose
}: {
  mode: "add" | "edit";
  site: SiteCatalogRecord;
  onClose: () => void;
}) {
  const { t } = useUi();
  const [activeTab, setActiveTab] = useState<SiteTab>("customer");
  const [selectedInspectionTabs, setSelectedInspectionTabs] = useState<InspectionTab[]>(() => readSitePmChecklistConfig(site.id).selectedTabs);
  const [inspectionSetCounts, setInspectionSetCounts] = useState(() => readSitePmChecklistConfig(site.id).setCounts);
  const [selectedChecklistItems, setSelectedChecklistItems] = useState(() => resolveSelectedChecklistItems(readSitePmChecklistConfig(site.id)));
  const title = mode === "add" ? t("sites.addModalTitle") : t("sites.editModalTitle");
  const visibleTabs = useMemo(() => (
    tabs.filter((tab) => tab.id === "customer" || tab.id === "contract" || selectedInspectionTabs.includes(tab.id as InspectionTab))
  ), [selectedInspectionTabs]);

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

  const saveChecklistConfig = () => {
    writeSitePmChecklistConfig(site.id, {
      selectedTabs: selectedInspectionTabs,
      setCounts: inspectionSetCounts,
      selectedItems: selectedChecklistItems
    });
    onClose();
  };

  const content = useMemo(() => {
    switch (activeTab) {
      case "customer":
        return <CustomerTab site={site} />;
      case "contract":
        return (
          <ContractTab
            selectedInspectionTabs={selectedInspectionTabs}
            onToggleInspectionTab={toggleInspectionTab}
          />
        );
      case "synapse":
        return <SynapseTab setCount={inspectionSetCounts.synapse} selectedItems={selectedChecklistItems.synapse} onToggleItem={(item, checked) => toggleChecklistItem("synapse", item, checked)} onAddSet={() => addInspectionSet("synapse")} />;
      case "server":
        return <DeviceTab title="SERVER" fields={["Location", "Manufacturer", "Host Name", "Model", "S/N or S/T", "IP Address", "ESX Version", "MT"]} checklistTitle="SERVER CHECKLIST" checklist={serverChecklist} addLabel={t("sites.addDeviceSet").replace("{device}", "Server")} setCount={inspectionSetCounts.server} selectedItems={selectedChecklistItems.server} onToggleItem={(item, checked) => toggleChecklistItem("server", item, checked)} onAddSet={() => addInspectionSet("server")} />;
      case "switch":
        return <DeviceTab title="SWITCH" fields={["Customer Name", "Location", "Brand", "Model", "S/N", "Host Name", "IP Address"]} checklistTitle="SWITCH CHECKLIST" checklist={switchChecklist} addLabel={t("sites.addDeviceSet").replace("{device}", "Switch")} setCount={inspectionSetCounts.switch} selectedItems={selectedChecklistItems.switch} onToggleItem={(item, checked) => toggleChecklistItem("switch", item, checked)} onAddSet={() => addInspectionSet("switch")} />;
      case "storage":
        return <DeviceTab title="STORAGE" fields={["Customer Name", "Location", "Model", "Manufacturer", "S/N or S/T", "MT"]} checklistTitle="STORAGE CHECKLIST" checklist={storageChecklist} addLabel={t("sites.addDeviceSet").replace("{device}", "Storage")} setCount={inspectionSetCounts.storage} selectedItems={selectedChecklistItems.storage} onToggleItem={(item, checked) => toggleChecklistItem("storage", item, checked)} onAddSet={() => addInspectionSet("storage")} />;
      case "environment":
        return <EnvironmentTab setCount={inspectionSetCounts.environment} selectedItems={selectedChecklistItems.environment} onToggleItem={(item, checked) => toggleChecklistItem("environment", item, checked)} onAddSet={() => addInspectionSet("environment")} />;
      case "diag":
        return <DiagTab setCount={inspectionSetCounts.diag} onAddSet={() => addInspectionSet("diag")} />;
      default:
        return null;
    }
  }, [activeTab, addInspectionSet, inspectionSetCounts, selectedChecklistItems, selectedInspectionTabs, site, t, toggleChecklistItem, toggleInspectionTab]);

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

        <footer className="modalFooter">
          <button className="button ghost" type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="button primary" type="button" onClick={saveChecklistConfig}>
            <Save size={16} />
            {t("sites.saveSite")}
          </button>
        </footer>
      </article>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}

function CustomerTab({ site }: { site: SiteCatalogRecord }) {
  const { t } = useUi();

  return (
    <div className="tabPane">
      <div className="formGrid">
        <Field label={`${t("fields.siteName")} *`} value={site.site} />
        <Field label={`${t("fields.customerName")} *`} value={site.customer} />
        <Field label={t("fields.contactName")} value={site.contact} />
        <Field label={t("fields.department")} value={site.department} />
        <Field label={t("fields.phone")} value={site.phone} />
        <Field label={t("fields.email")} value={site.email} />
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
        <Field label={t("fields.siteOwner")} value={site.owner} />
        <Field label={t("fields.latitude")} value="13.7563" />
        <Field label={t("fields.longitude")} value="100.5018" />
      </div>
    </div>
  );
}

function ContractTab({
  selectedInspectionTabs,
  onToggleInspectionTab
}: {
  selectedInspectionTabs: InspectionTab[];
  onToggleInspectionTab: (tabId: InspectionTab, checked: boolean) => void;
}) {
  const { lang, t } = useUi();

  return (
    <div className="tabPane">
      <div className="formGrid">
        <label className="label">
          {t("fields.pmCycle")}
          <select className="select" defaultValue="รายไตรมาส">
            <option value="รายไตรมาส">{localizeLabel("รายไตรมาส", lang)}</option>
            <option value="รายเดือน">{localizeLabel("รายเดือน", lang)}</option>
            <option value="semi annual">{localizeLabel("semi annual", lang)}</option>
          </select>
        </label>
        <Field label={t("fields.contractNumber")} placeholder={t("fields.contractNumber")} />
      </div>

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
        <textarea className="textarea" />
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
  setCount,
  selectedItems,
  onToggleItem,
  onAddSet
}: {
  setCount: number;
  selectedItems: string[];
  onToggleItem: (item: string, checked: boolean) => void;
  onAddSet: () => void;
}) {
  const { t } = useUi();

  return (
    <div className="tabPane">
      {Array.from({ length: setCount }, (_, index) => index + 1).map((setId) => (
        <SynapseSetPanel key={setId} setId={setId} selectedItems={selectedItems} onToggleItem={onToggleItem} />
      ))}
      <button className="addLineButton" type="button" onClick={onAddSet}>
        <Plus size={15} />
        {t("sites.addSynapseSet")}
      </button>
    </div>
  );
}

function SynapseSetPanel({
  setId,
  selectedItems,
  onToggleItem
}: {
  setId: number;
  selectedItems: string[];
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

      <ChecklistSection title={`SYNAPSE SYSTEM CHECKLIST #${setId}`} items={synapseSystem} selectedItems={selectedItems} onToggleItem={onToggleItem} />
      <ChecklistSection title={`CONFIGURATION BACKUP CHECKLIST #${setId}`} items={configurationBackup} selectedItems={selectedItems} onToggleItem={onToggleItem} />
      <Field label="Configuration Backup Path" placeholder="Configuration Backup Path" />

      <section className="sectionCard">
        <h3>BACKUP DEVICE / DATA BACKUP CHECKING #{setId}</h3>
        <RadioGroup label={`Backup Type ${setId}`} items={["DR Site", "S", "Other"]} />
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
  fields,
  checklistTitle,
  checklist,
  addLabel,
  setCount,
  selectedItems,
  onToggleItem,
  onAddSet
}: {
  title: string;
  fields: string[];
  checklistTitle: string;
  checklist: string[];
  addLabel: string;
  setCount: number;
  selectedItems: string[];
  onToggleItem: (item: string, checked: boolean) => void;
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
          <ChecklistSection title={`${checklistTitle} #${setId}`} items={checklist} selectedItems={selectedItems} onToggleItem={onToggleItem} />
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
  setCount,
  selectedItems,
  onToggleItem,
  onAddSet
}: {
  setCount: number;
  selectedItems: string[];
  onToggleItem: (item: string, checked: boolean) => void;
  onAddSet: () => void;
}) {
  const { t } = useUi();

  return (
    <div className="tabPane">
      {Array.from({ length: setCount }, (_, index) => index + 1).map((setId) => (
        <EnvironmentSetPanel key={setId} setId={setId} selectedItems={selectedItems} onToggleItem={onToggleItem} />
      ))}
      <button className="addLineButton" type="button" onClick={onAddSet}>
        <Plus size={15} />
        {t("sites.addEnvironmentSet")}
      </button>
    </div>
  );
}

function EnvironmentSetPanel({
  setId,
  selectedItems,
  onToggleItem
}: {
  setId: number;
  selectedItems: string[];
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
      <ChecklistSection title={`${t("sites.environmentChecklist")} #${setId}`} items={environmentMain} selectedItems={selectedItems} onToggleItem={onToggleItem} />
      <ChecklistSection title={`${t("sites.cablingPowerChecklist")} #${setId}`} items={environmentPower} selectedItems={selectedItems} onToggleItem={onToggleItem} />
      <ChecklistSection title={`SECURITY CHECKLIST #${setId}`} items={environmentSecurity} selectedItems={selectedItems} onToggleItem={onToggleItem} />
    </>
  );
}

function DiagTab({ setCount, onAddSet }: { setCount: number; onAddSet: () => void }) {
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
          onToggle={toggleDiagCheck}
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
  onToggle
}: {
  diagSet: DiagSet;
  onToggle: (setId: number, device: string, check: DiagCheck) => void;
}) {
  const { t } = useUi();

  return (
    <>
      <section className="sectionCard">
        <h3>{t("sites.diagSetTitle")} #{diagSet.id}</h3>
        <div className="formGrid">
          {["Customer Name", "Location", "Brand", "Model", "S/N", "IP Address", "OS"].map((field) => (
            <Field key={field} label={field} placeholder={field} />
          ))}
        </div>
        <RadioGroup label={`Antivirus ${diagSet.id}`} items={["Installed", "No Installation"]} />
        <Field label="Definition Date" placeholder="DD/MM/YYYY" />
      </section>

      <Calibrate title={`Calibrate: Monitor 1 - DIAG #${diagSet.id}`} />
      <Calibrate title={`Calibrate: Monitor 2 - DIAG #${diagSet.id}`} />

      <section className="sectionCard">
        <RadioGroup label={`Diagnostic Monitor / SMPTE Pattern ${diagSet.id}`} items={["ปกติ", "ผิดปกติ"]} />
        <h3>Physical Status</h3>
        <div className="formGrid">
          {["Act. Times Monitor 1", "Act. Times Monitor 2", "Backlight Times Monitor 1", "Backlight Times Monitor 2", "Mfg Date Monitor 1", "Mfg Date Monitor 2"].map((field) => (
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
  title,
  items,
  selectedItems,
  onToggleItem
}: {
  title: string;
  items: string[];
  selectedItems?: string[];
  onToggleItem?: (item: string, checked: boolean) => void;
}) {
  const { lang } = useUi();

  return (
    <section className="sectionCard">
      <h3>{localizeLabel(title, lang)}</h3>
      <div className="checkList">
        {items.map((item) => (
          <CheckItem
            key={item}
            label={item}
            checked={selectedItems?.includes(item)}
            onChange={onToggleItem ? (checked) => onToggleItem(item, checked) : undefined}
          />
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
