import type { MapDescriptor, MapDescriptor1 } from '../data/mapdescriptor';
import slug from 'slug';
import { parse } from 'path';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import ventureCards from "~/data/venturecards.yml";
import backgrounds, { type Background } from "~/data/backgrounds.yml";

type MapDescriptorExtended = Omit<MapDescriptor1, 'music' | 'changelog'> & {
  path: string;
  slug: string;
  imageUrls: string[];
  backgroundData: Background;
  notesHtml?: string;
  changelog?: {
    version: number | string;
    added?: string[];
    changed?: string[];
    removed?: string[];
  }[];
  currentVersion?: string | number;
  music?: Omit<MapDescriptor, 'music'> & {
    download: string[] | null;
  };
}

const boards = getBoards();
export default boards;


function getBoards(): MapDescriptorExtended[] {
  const boardFiles: Record<string, MapDescriptor> = import.meta.glob('/_maps/*/*.{yml,yaml}', { eager: true });
  const boards: MapDescriptorExtended[] = [];
  let defaultEasyVentureCards: number[] | undefined;
  let defaultStandardVentureCards: number[] | undefined;
  for (const [path, boardConst] of Object.entries(boardFiles)) {
    const board = structuredClone(boardConst)
    // some post processing...

    // merge frbFile1,2,3,4 into frbFiles
    if(!board.frbFiles) {
      const frbFiles: string[] = [];
      if(board.frbFile2 !== undefined) {
        frbFiles.push(board.frbFile2);
      }
      if(board.frbFile3 !== undefined) {
        frbFiles.push(board.frbFile3);
      }
      if(board.frbFile4 !== undefined) {
        frbFiles.push(board.frbFile4);
      }
      board.frbFiles = [board.frbFile1!, ...frbFiles];
    }
    const parsedPath = parse(path)

    // set the directory path for the board
    board.path = parsedPath.dir;

    // set the slug name for the board
    board.slug = slug(parsedPath.name);

    // set the background data from the backgrounds.yml
    board.backgroundData = backgrounds.find((b) => b.background === board.background) as Background;

    // set the image urls for each frb file
    board.imageUrls = board.frbFiles!.map((frbFile: string) => `${parsedPath.dir}/${frbFile}.webp`);

    // render the notes
    if (board.notes !== undefined) {
      const html = marked.parse(board.notes, { async: false }) as string;
      board.notesHtml = DOMPurify.sanitize(html);
    }

    // make sure changelog is an array
    if(board.changelog !== undefined) {
      for(const change of board.changelog) {
        if(typeof change.added === 'string') {
          change.added = [change.added];
        }
        if(typeof change.changed === 'string') {
          change.changed = [change.changed];
        }
        if(typeof change.removed === 'string') {
          change.removed = [change.removed];
        }
      }
      // set current version
      board.currentVersion = board.changelog[0].version;
    }

    // make sure music download is an array
    if(board.musicDownload !== undefined) {
      if(typeof board.musicDownload === 'string') {
        board.musicDownload = [board.musicDownload];
      }
    }

    // set the default venture card list
    if(board.ventureCards === undefined) {
      let defaultVentureCards: number[];
      if(board.ruleSet == "Standard") {
        if(defaultStandardVentureCards === undefined) {
          defaultStandardVentureCards = new Array(128).fill(0);
          for(let i = 0; i < 128; i++) {
            if(ventureCards[i].defaultStandard) {
              defaultStandardVentureCards[i] = 1;
            }
          }
        }
        defaultVentureCards = defaultStandardVentureCards;
      } else {
        if(defaultEasyVentureCards === undefined) {
          defaultEasyVentureCards = new Array(128).fill(0);
          for(let i = 0; i < 128; i++) {
            if(ventureCards[i].defaultEasy) {
              defaultEasyVentureCards[i] = 1;
            }
          }
        }
        defaultVentureCards = defaultEasyVentureCards;
      }
      // @ts-ignore
      board.ventureCards = defaultVentureCards;
    }

    boards.push(board as MapDescriptorExtended);
  }
  return boards;
};
