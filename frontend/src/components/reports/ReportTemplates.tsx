'use client';

import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';

export interface ReportTemplate {
  id: string;
  name: string;
  modality: string;
  content: string;
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'chest-xr',
    name: 'Chest X-Ray',
    modality: 'CR/DX',
    content: `CHEST X-RAY REPORT

CLINICAL INDICATION:
[Clinical indication here]

TECHNIQUE:
PA and lateral chest radiographs were obtained.

FINDINGS:
Lungs: [Clear / Describe findings]
Heart: Normal size and contour. Cardiothoracic ratio within normal limits.
Mediastinum: Normal width and contours.
Pleural spaces: No pleural effusion or pneumothorax.
Bones: No acute osseous abnormality.
Soft tissues: Unremarkable.

IMPRESSION:
[Normal study / Describe impression]`,
  },
  {
    id: 'chest-ct',
    name: 'Chest CT',
    modality: 'CT',
    content: `CHEST CT REPORT

CLINICAL INDICATION:
[Clinical indication here]

TECHNIQUE:
CT of the chest was performed with/without IV contrast.

FINDINGS:
Lungs and airways:
- [Describe lung parenchyma, airways]

Pleura:
- [No effusion / Describe pleural findings]

Mediastinum and hila:
- [Describe mediastinal structures, lymph nodes]

Heart and great vessels:
- [Describe cardiac findings if relevant]

Bones and soft tissues:
- [Describe osseous and soft tissue findings]

IMPRESSION:
1. [Primary finding]
2. [Additional findings]`,
  },
  {
    id: 'brain-ct',
    name: 'Brain CT',
    modality: 'CT',
    content: `BRAIN CT REPORT

CLINICAL INDICATION:
[Clinical indication here]

TECHNIQUE:
Non-contrast CT of the brain was performed.

FINDINGS:
Brain parenchyma:
- No acute intracranial hemorrhage.
- No territorial infarct.
- [Describe white matter, gray matter]

Ventricles and sulci:
- [Normal size / Describe findings]

Posterior fossa:
- [Normal cerebellum and brainstem]

Skull and scalp:
- No acute fracture.
- [Describe any skull findings]

IMPRESSION:
[Normal study / Describe impression]`,
  },
  {
    id: 'brain-mri',
    name: 'Brain MRI',
    modality: 'MR',
    content: `BRAIN MRI REPORT

CLINICAL INDICATION:
[Clinical indication here]

TECHNIQUE:
MRI of the brain performed with sequences: T1, T2, FLAIR, DWI, T1+Gad.

FINDINGS:
T2/FLAIR signal:
- [Describe signal abnormalities]

Diffusion (DWI/ADC):
- [No restricted diffusion / Describe DWI findings]

Post-contrast T1:
- [No abnormal enhancement / Describe enhancement]

Ventricles:
- [Normal size and position]

Posterior fossa:
- [Describe cerebellum, brainstem]

Vascular structures:
- [Describe vascular findings if applicable]

IMPRESSION:
1. [Primary finding]`,
  },
  {
    id: 'spine-mri',
    name: 'Spine MRI',
    modality: 'MR',
    content: `SPINE MRI REPORT

CLINICAL INDICATION:
[Clinical indication here]

TECHNIQUE:
MRI of the [cervical/thoracic/lumbar] spine performed.
Sequences: Sagittal T1, T2, STIR; Axial T2.

FINDINGS:
Vertebral bodies and alignment:
- [Normal alignment / Describe alignment]
- [Describe vertebral body signal]

Intervertebral discs:
- [Describe disc levels and findings]

Spinal canal and cord/cauda equina:
- [Adequate canal dimensions / Describe stenosis]
- [Normal cord signal]

Neural foramina:
- [No significant foraminal narrowing / Describe]

Paraspinal soft tissues:
- [Unremarkable]

IMPRESSION:
1. [Primary finding]
2. [Additional findings]`,
  },
  {
    id: 'abdomen-ct',
    name: 'Abdomen CT',
    modality: 'CT',
    content: `ABDOMEN & PELVIS CT REPORT

CLINICAL INDICATION:
[Clinical indication here]

TECHNIQUE:
CT of the abdomen and pelvis performed with IV contrast (portal venous phase).

FINDINGS:
Liver: [Normal size and attenuation / Describe findings]
Gallbladder and biliary: [Normal / Describe]
Spleen: [Normal size / Describe]
Pancreas: [Normal / Describe]
Kidneys and adrenals: [Normal bilaterally / Describe]
Bowel: [No obstruction / Describe]
Mesentery and peritoneum: [No free air or fluid / Describe]
Lymph nodes: [No lymphadenopathy / Describe]
Vascular structures: [Aorta and IVC normal]
Bones: [No aggressive lesion]

IMPRESSION:
1. [Primary finding]`,
  },
];

interface ReportTemplatesProps {
  onSelect: (content: string) => void;
}

export default function ReportTemplates({ onSelect }: ReportTemplatesProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        Templates
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-52">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.content); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 text-left transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="text-sm text-gray-200">{t.name}</span>
              <span className="text-xs text-gray-600 ml-2">{t.modality}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
