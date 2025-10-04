/////////********/////////********/////////********/////////
// HW NPC Conversation script for Meta Horizons - v1
// by LadyMo218 - October 2025 
/////////********/////////********/////////********/////////

import {
  Component,
  PropTypes,
  Player,
  CodeBlockEvents,
  Entity,
} from 'horizon/core';
import { Npc } from 'horizon/npc';

//
// -- Types
//

interface ConversationTrigger {
  ifNpcName?: string; // NEW: specifies which NPC this line belongs to
  ifNpcSays: string[];
  thenNpcReplies: {
    [npcName: string]: string[];
  };
}

interface DialogueLine {
  npcName: string;
  line: string;
}

interface NpcState {
  memory: string[];
}

interface NpcProfile {
  name: string;
  backstory: string;
  interests: string[];
  personality:
    | 'serious'
    | 'funny'
    | 'paranoid'
    | 'chill'
    | 'egotistical'
    | 'skeptical'
    | 'sarcastic'
    | 'gambler';
}

//
// -- NPC Profiles
//
const npcProfiles: Record<string, NpcProfile> = {
  NPC_Jamel: {
    name: 'NPC_Jamel',
    backstory: `Jamel was born in Queens, New York...`,
    interests: ['XRP', 'blockchain', 'Jets', 'Vegas'],
    personality: 'sarcastic',
  },
  NPC_Jason: {
    name: 'NPC_Jason',
    backstory: `Jason is a wannabe crypto mogul...`,
    interests: ['NFTs', 'altcoins', 'Hyundai Genesis', 'The Tail of The Dragon'],
    personality: 'funny',
  },
};

//
// -- Conversation Triggers
//
const conversationTriggers: ConversationTrigger[] = [
  {
    ifNpcName: "NPC_Jamel",
    ifNpcSays: [
      "XRP doesn't move, it flows.",
      "XRP is on the verge of something big.",
      "Ya'll ready for that money?",
      "A new block just dropped! I can feel the vibration.",
      "Let's get this munayyyyyy!",
    ],
    thenNpcReplies: {
      NPC_Jason: [
        "Here we go again with the XRP!",
        "You should be getting paid in it at this point.",
        "Still flowing nowhere.",
        "I bet you are still going long aren't you?",
        "When's the last time you checked the charts?",
        "It's a rollercoaster, bro.",
        "What's your exit strategy?",
        "You need to try to go short as well. You can make money doing both.",
      ],
    },
  },
  {
    ifNpcName: "NPC_Jamel",
    ifNpcSays: [
      "Hey Jason! I'm gonna ring your neck if you don't bring me my money by 6pm.",
      
    ],
    thenNpcReplies: {
      NPC_Jason: [
        "I spent your money on a Jets bet I followed you on. Too bad!",
        
      ],
    },
  },
  {
    ifNpcName: "NPC_Jamel",
    ifNpcSays: ["The Jets are gonna surprise everyone this year."],
    thenNpcReplies: {
      NPC_Jason: [
        "Yeah, surprise me with another loss.",
        "Jets? Bro, that’s a lifestyle of pain.",
        "You really think they have a chance?",
        "I respect the optimism, but c'mon.",
        "Jets fans are the most loyal, I'll give you that.",
        "You ever thought about switching teams?",
      ],
    },
  },
  {
    ifNpcName: "NPC_Jason",
    ifNpcSays: ["I'm staying short on XRP!"],
    thenNpcReplies: {
      NPC_Jamel: [
        "That's not a financial strategy.",
        "I hope you aren't serious.",
        "Just remember who told you first when it tanks.",
        "You do you, bro.",
      ],
    },
  },
  {
    ifNpcName: "NPC_Jason",
    ifNpcSays: ["So, when are you going to come with me to the Dragon?"],
    thenNpcReplies: {
      NPC_Jamel: [
        "Only if I’m driving my CyberTruck.",
        "Man, that road gives me anxiety.",
        "Uh, I think I'll pass.",
        "I prefer the Vegas strip.",
        "You sure you can handle it?",
        "I heard it's a wild ride.",
        "Maybe if we take it slow.",
      ],
    },
  },
];

//
// -- Helpers
//
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomUnusedLine(all: string[], memory: string[]): string {
  const unused = all.filter(l => !memory.includes(l));
  if (unused.length === 0) {
    memory.length = 0;
    return getRandomItem(all);
  }
  return getRandomItem(unused);
}

function estimateSpeakingDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(Math.max(words * 400, 1000), 6000);
}

//
// -- Component
//
class NpcConversationManager extends Component<typeof NpcConversationManager> {
  static propsDefinition = {
    npcParticipant1: { type: PropTypes.Entity },
    npcParticipant2: { type: PropTypes.Entity },
    npcParticipant3: { type: PropTypes.Entity },
  };

  private playersInTrigger = new Set<number>();
  private isConversationActive = false;
  private npcMap = new Map<string, Npc>();
  private npcStates = new Map<string, NpcState>();
  private npcRelationships = new Map<string, Map<string, number>>();
  private currentSpeakerIndex = 0;
  private lastSpokenLine: DialogueLine | null = null;

  override preStart() {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, (player: Player) => {
      this.playersInTrigger.add(player.id);
      if (!this.isConversationActive) this.startConversation();
    });

    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitTrigger, (player: Player) => {
      this.playersInTrigger.delete(player.id);
      if (this.playersInTrigger.size === 0) this.stopConversation();
    });
  }

  override start() {
    this.initializeNpcs();
  }

  private initializeNpcs() {
    const npcEntities = [
      this.props.npcParticipant1,
      this.props.npcParticipant2,
      this.props.npcParticipant3,
    ];

    for (const entity of npcEntities) {
      if (!entity) continue;
      const npc = entity.as(Npc);
      const name = entity.name.get();
      if (!npc) continue;

      this.npcMap.set(name, npc);
      this.npcStates.set(name, {
        memory: [],
      });
    }

    const names = Array.from(this.npcMap.keys());
    for (const from of names) {
      const rels = new Map<string, number>();
      for (const to of names) {
        if (from !== to) rels.set(to, getRandomItem([-10, 0, 10]));
      }
      this.npcRelationships.set(from, rels);
    }
  }

  private startConversation() {
    if (this.npcMap.size < 2) return;
    this.isConversationActive = true;
    this.currentSpeakerIndex = 0;
    void this.speakNextLine();
  }

  private stopConversation() {
    this.isConversationActive = false;
    this.npcMap.forEach(npc => npc.conversation.stopSpeaking());
  }

  private async speakNextLine(): Promise<void> {
    if (!this.isConversationActive) return;

    const npcNames = Array.from(this.npcMap.keys());
    const npcName = npcNames[this.currentSpeakerIndex % npcNames.length];
    const npc = this.npcMap.get(npcName);
    const state = this.npcStates.get(npcName);

    if (!npc || !state) {
      this.currentSpeakerIndex++;
      void this.speakNextLine();
      return;
    }

    let line: string;
    const last = this.lastSpokenLine;

    const replyOptions = this.findReplies(npcName, last?.line ?? '', last?.npcName ?? '');
    if (replyOptions?.length) {
      line = getRandomUnusedLine(replyOptions, state.memory);
    } else {
      line = this.getStandaloneLineFor(npcName, state.memory);
    }

    state.memory.push(line);
    this.lastSpokenLine = { npcName, line };

    try {
      await npc.conversation.speak(line);
      this.currentSpeakerIndex++;
      const pause = estimateSpeakingDuration(line) + 300;
      void this.async.setTimeout(() => this.speakNextLine(), pause);
    } catch {
      this.currentSpeakerIndex++;
      void this.async.setTimeout(() => this.speakNextLine(), 800);
    }
  }

  private getStandaloneLineFor(npcName: string, memory: string[]): string {
    const starters: string[] = [];

    for (const trigger of conversationTriggers) {
      if (trigger.ifNpcName && trigger.ifNpcName !== npcName) continue;

      for (const phrase of trigger.ifNpcSays) {
        starters.push(phrase);
      }
    }

    return getRandomUnusedLine(starters, memory);
  }

  private findReplies(npcName: string, lastLine: string, fromNpc: string): string[] | null {
    const normLast = lastLine.toLowerCase();

    for (const trigger of conversationTriggers) {
      if (trigger.ifNpcName && trigger.ifNpcName !== fromNpc) {
        continue;
      }

      for (const triggerPhrase of trigger.ifNpcSays) {
        const match = triggerPhrase.toLowerCase();

        if (match === normLast && trigger.thenNpcReplies[npcName]) {
          console.log(`[NPC CONVO] Exact match: ${fromNpc} → ${npcName}`);
          return trigger.thenNpcReplies[npcName];
        }

        const triggerWords = match.split(/\s+/);
        const lastWords = normLast.split(/\s+/);
        const shared = triggerWords.filter(w => lastWords.includes(w));

        if (shared.length >= 4 && trigger.thenNpcReplies[npcName]) {
          console.log(`[NPC CONVO] Fuzzy match (${shared.length}): ${fromNpc} → ${npcName}`);
          return trigger.thenNpcReplies[npcName];
        }
      }
    }

    console.log(`[NPC CONVO] No match: fallback for ${npcName}`);
    return null;
  }
}

Component.register(NpcConversationManager);
 
