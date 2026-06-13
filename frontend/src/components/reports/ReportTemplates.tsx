'use client';

import React, { useState } from 'react';
import { FileText, Search, ChevronRight } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  modality: string;
  bodyPart: string;
  content: string;
  findings: string;
  impression: string;
}

interface ReportTemplatesProps {
  onSelect: (content: string, findings: string, impression: string) => void;
}

const TEMPLATES: Template[] = [
  {
    id: 'chest-xray',
    name: 'Chest X-Ray',
    modality: 'CR/DX',
    bodyPart: 'Chest',
    findings: `LUNGS: The lungs are clear. No focal consolidation, pleural effusion, or pneumothorax identified. The pulmonary vascularity is within normal limits.

HEART: The cardiac silhouette is normal in size. The cardiothoracic ratio is within normal limits.

MEDIASTINUM: The mediastinum is of normal width and contour. No mediastinal widening.

BONES: The visualized osseous structures are intact. No acute fracture identified.

SOFT TISSUES: The soft tissues appear unremarkable.`,
    impression: `Normal chest radiograph. No acute cardiopulmonary findings.`,
    content: '',
  },
  {
    id: 'chest-ct',
    name: 'Chest CT',
    modality: 'CT',
    bodyPart: 'Chest',
    findings: `TECHNIQUE: CT of the chest was performed [with/without] intravenous contrast.

LUNGS AND AIRWAYS: The lungs demonstrate normal aeration. No focal consolidation, mass, or nodule identified. The airways are patent to the subsegmental level bilaterally. No pleural effusion or pneumothorax.

PLEURA: No pleural thickening or effusion.

MEDIASTINUM AND HILA: The mediastinal and hilar structures are unremarkable. No enlarged lymph nodes by size criteria. The great vessels are normal in caliber.

HEART AND PERICARDIUM: The heart is normal in size. No pericardial effusion.

CHEST WALL: No chest wall abnormality. The visualized osseous structures are intact.

UPPER ABDOMEN (limited): The visualized upper abdominal organs appear unremarkable.`,
    impression: `Normal CT examination of the chest. No acute findings.`,
    content: '',
  },
  {
    id: 'brain-ct',
    name: 'Brain CT',
    modality: 'CT',
    bodyPart: 'Brain',
    findings: `TECHNIQUE: Non-contrast CT of the brain was performed.

BRAIN PARENCHYMA: The brain parenchyma demonstrates normal gray-white matter differentiation. No focal areas of abnormal density. No infarction, hemorrhage, or mass lesion identified.

VENTRICLES: The ventricles are normal in size and configuration. No hydrocephalus.

SULCI AND CISTERNS: The sulci and basal cisterns are appropriate for patient age. No evidence of herniation.

MIDLINE: The midline structures are in normal position.

POSTERIOR FOSSA: The cerebellum and brainstem appear normal.

CALVARIUM AND SCALP: The calvarium is intact. No overlying soft tissue abnormality.

ORBITS/SINUSES (limited): No significant abnormality in the visualized orbits or paranasal sinuses.`,
    impression: `Normal non-contrast CT of the brain. No acute intracranial abnormality.`,
    content: '',
  },
  {
    id: 'brain-mri',
    name: 'Brain MRI',
    modality: 'MR',
    bodyPart: 'Brain',
    findings: `TECHNIQUE: MRI of the brain was performed [with/without] gadolinium contrast including sequences: T1, T2, FLAIR, DWI, ADC, T1+C.

BRAIN PARENCHYMA: The brain demonstrates normal signal intensity on all sequences. Normal gray-white matter differentiation is maintained. No restricted diffusion to suggest acute infarction. No T2/FLAIR signal abnormality.

VENTRICLES: The ventricles are normal in size. No hydrocephalus.

EXTRA-AXIAL SPACES: The extra-axial spaces are normal.

MIDLINE: No midline shift.

POSTERIOR FOSSA: The cerebellum and brainstem demonstrate normal morphology and signal intensity.

ENHANCEMENT: No abnormal enhancement identified.

VASCULAR: Flow voids are preserved in the major intracranial vessels.

CALVARIUM: No calvarial signal abnormality.`,
    impression: `Normal MRI of the brain. No acute intracranial pathology identified.`,
    content: '',
  },
  {
    id: 'spine-mri',
    name: 'Spine MRI',
    modality: 'MR',
    bodyPart: 'Spine',
    findings: `TECHNIQUE: MRI of the [cervical/thoracic/lumbar] spine was performed [with/without] contrast.

ALIGNMENT: The vertebral bodies demonstrate normal alignment. No listhesis.

VERTEBRAL BODIES: The vertebral bodies are normal in height and signal intensity. No compression fracture or marrow signal abnormality.

INTERVERTEBRAL DISCS: The intervertebral discs demonstrate normal signal and height at all levels. No disc herniation or significant disc degeneration.

SPINAL CANAL: The spinal canal is patent. No central canal stenosis.

NEURAL FORAMINA: The neural foramina are widely patent bilaterally.

SPINAL CORD/CONUS: The spinal cord demonstrates normal morphology and signal. The conus medullaris terminates at the normal level.

PARASPINAL SOFT TISSUES: The paraspinal soft tissues are unremarkable.`,
    impression: `Normal MRI of the [cervical/thoracic/lumbar] spine. No significant pathology identified.`,
    content: '',
  },
  {
    id: 'abdomen-ct',
    name: 'Abdomen CT',
    modality: 'CT',
    bodyPart: 'Abdomen',
    findings: `TECHNIQUE: CT of the abdomen and pelvis was performed [with/without] intravenous and oral contrast.

LIVER: The liver is normal in size and attenuation. No focal hepatic lesion.

GALLBLADDER/BILE DUCTS: The gallbladder is present without gallstones. No biliary ductal dilatation.

SPLEEN: The spleen is normal in size and density.

PANCREAS: The pancreas is unremarkable. No ductal dilatation.

ADRENAL GLANDS: The adrenal glands are normal.

KIDNEYS: The kidneys are normal in size, shape, and enhancement. No hydronephrosis, calculi, or solid lesion.

BOWEL: The bowel loops show normal caliber and wall thickness. No obstruction.

MESENTERY/LYMPH NODES: No free fluid or lymphadenopathy.

VASCULATURE: The aorta is normal in caliber. No aneurysm.

PELVIS: The pelvic organs are unremarkable.

BONES: The osseous structures are intact. No acute fracture.`,
    impression: `Normal CT of the abdomen and pelvis. No acute intra-abdominal pathology.`,
    content: '',
  },
  {
    id: 'pelvis-ct',
    name: 'Pelvis CT',
    modality: 'CT',
    bodyPart: 'Pelvis',
    findings: `TECHNIQUE: CT of the pelvis was performed [with/without] intravenous contrast.

BLADDER: The urinary bladder is normal in appearance. The bladder wall is of normal thickness. No intraluminal filling defect.

REPRODUCTIVE ORGANS: [Describe as appropriate for patient]

BOWEL: The bowel loops in the pelvis appear normal. No thickening or obstruction.

MESENTERY/LYMPH NODES: No free fluid or pelvic lymphadenopathy.

BONES: The pelvic bones are intact. No fracture or destructive lesion.

VASCULATURE: The iliac vessels are normal in caliber.`,
    impression: `Normal CT examination of the pelvis.`,
    content: '',
  },
  {
    id: 'msk',
    name: 'Musculoskeletal',
    modality: 'MR/CR',
    bodyPart: 'MSK',
    findings: `TECHNIQUE: [MRI/X-ray] of the [anatomical region] was performed.

BONES: The osseous structures demonstrate normal signal intensity/density. No fracture, stress reaction, or marrow-replacing lesion.

JOINT SPACE: The joint space is maintained. No significant joint space narrowing.

CARTILAGE: The articular cartilage appears intact. No focal chondral defect.

LIGAMENTS: The major ligamentous structures are intact.

TENDONS: The tendons are of normal caliber, signal, and morphology. No tear or tendinopathy.

SOFT TISSUES: The periarticular soft tissues are unremarkable. No joint effusion.`,
    impression: `No acute bony or soft tissue abnormality of the [anatomical region].`,
    content: '',
  },
];

export default function ReportTemplates({ onSelect }: ReportTemplatesProps) {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Template | null>(null);

  const filtered = TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.modality.toLowerCase().includes(search.toLowerCase()) ||
      t.bodyPart.toLowerCase().includes(search.toLowerCase())
  );

  const groups = filtered.reduce<Record<string, Template[]>>((acc, t) => {
    if (!acc[t.bodyPart]) acc[t.bodyPart] = [];
    acc[t.bodyPart].push(t);
    return acc;
  }, {});

  return (
    <div className="flex h-64 bg-gray-800/50">
      {/* Template list */}
      <div className="w-48 border-r border-gray-700 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white pl-6 pr-2 py-1 rounded text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groups).map(([group, templates]) => (
            <div key={group}>
              <p className="px-2 py-1 text-xs text-gray-600 uppercase tracking-wider bg-gray-900/40">
                {group}
              </p>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPreview(t)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-700 transition-colors ${
                    preview?.id === t.id ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">No templates found</p>
          )}
        </div>
      </div>

      {/* Preview pane */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {preview ? (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 flex-shrink-0">
              <div className="min-w-0">
                <span className="text-sm font-medium text-white">{preview.name}</span>
                <span className="ml-2 text-xs text-gray-500">{preview.modality}</span>
              </div>
              <button
                onClick={() =>
                  onSelect(
                    preview.content || `${preview.findings}\n\n${preview.impression}`,
                    preview.findings,
                    preview.impression
                  )
                }
                className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded font-medium transition-colors ml-2"
              >
                Use Template
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Findings</p>
                <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap break-words">{preview.findings}</pre>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Impression</p>
                <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">{preview.impression}</pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Select a template to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
