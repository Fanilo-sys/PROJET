import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import * as mammoth from 'mammoth';

/**
 * Génère un blob DOCX à partir d'un modèle avec balises.
 */
export const generateDocxBlob = async (
  templatePath: string,
  data: Record<string, string>
): Promise<Blob> => {
  const response = await fetch(templatePath);
  if (!response.ok) throw new Error(`Impossible de charger le modèle ${templatePath}`);
  const arrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return blob;
};

/**
 * Extrait le HTML du DOCX pour l'aperçu en préservant la mise en forme
 * Utilise mammoth.js pour une conversion fidèle du modèle Word
 */
export const convertDocxToHtml = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h3:fresh",
        "p[style-name='Heading 2'] => h4:fresh",
        "p[style-name='Heading 3'] => h5:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "p[style-name='List Paragraph'] => li:fresh",
      ],
    }
  );

  if (result.messages.length > 0) {
    console.warn('⚠️ Mammoth messages:', result.messages);
  }

  // On encapsule le HTML dans un conteneur stylé pour ressembler à Word
  const styledHtml = `
    <div style="
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.15;
      padding: 20px;
      background: white;
      color: #000;
    ">
      ${result.value}
    </div>
  `;

  return styledHtml;
};

/**
 * Télécharge un .docx généré à partir d'un modèle avec balises.
 */
export const downloadDocxFromTemplate = async (
  templatePath: string,
  data: Record<string, string>,
  fileName: string
) => {
  const blob = await generateDocxBlob(templatePath, data);
  saveAs(blob, fileName);
};