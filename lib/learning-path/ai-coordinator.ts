/**
 * AI Coordinator - Learning Orchestrator
 * 
 * The central AI system that orchestrates multi-disciplinary learning paths
 * Acts as "Learning Conductor" - coordinates mentors, segments, and transitions
 */

import {
  SubjectDomain,
  SubjectMentor,
  KnowledgeNode,
  LearningPathSegment,
  PathTransition,
  MultiDisciplinaryPath,
  AICoordinatorInsight,
  AICoordinatorContext,
  MentorAssignment,
} from './types';

export class AICoordinator {
  /**
   * Main orchestration method - creates multi-disciplinary learning path
   */
  async createMultiDisciplinaryPath(
    studentId: string,
    goals: string[],
    interests: string[],
    context: AICoordinatorContext
  ): Promise<MultiDisciplinaryPath> {
    console.log(`🎼 [AI-Coordinator] Creating multi-disciplinary path for student ${studentId}`);

    // Step 1: Analyze goals and identify required domains
    const requiredDomains = this.identifyRequiredDomains(goals, interests);
    console.log(`📊 [AI-Coordinator] Identified domains: ${requiredDomains.join(', ')}`);

    // Step 2: Build knowledge graph subgraph
    const relevantNodes = this.selectRelevantNodes(
      context.knowledgeGraph,
      requiredDomains,
      context.studentProfile
    );

    // Step 3: Segment path by domain
    const segments = this.segmentPathByDomain(
      relevantNodes,
      requiredDomains,
      context
    );

    // Step 4: Identify cross-domain transitions
    const transitions = this.identifyCrossDomainTransitions(segments, relevantNodes);

    // Step 5: Assign mentors to segments
    const mentorAssignments = await this.assignMentorsToSegments(
      segments,
      context.availableMentors
    );

    // Step 6: Generate AI insights
    const insights = this.generateInitialInsights(segments, transitions);

    // Step 7: Identify cross-disciplinary panel
    const panelMentors = this.selectPanelMentors(
      requiredDomains,
      context.availableMentors
    );

    const path: MultiDisciplinaryPath = {
      id: `path_${Date.now()}`,
      studentId,
      title: this.generatePathTitle(goals, requiredDomains),
      description: this.generatePathDescription(goals, requiredDomains),
      primaryDomain: requiredDomains[0],
      involvedDomains: requiredDomains,
      segments,
      coordinatorInsights: insights,
      crossDisciplinaryPanel: panelMentors,
      overallProgress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
    };

    console.log(`✅ [AI-Coordinator] Multi-disciplinary path created: ${path.id}`);
    return path;
  }

  /**
   * Identify required domains based on goals and interests
   */
  private identifyRequiredDomains(goals: string[], interests: string[]): SubjectDomain[] {
    const domainKeywords: Record<SubjectDomain, string[]> = {
      [SubjectDomain.MATH]: ['toán', 'math', 'đại số', 'hình học', 'giải tích'],
      [SubjectDomain.PHYSICS]: ['vật lý', 'physics', 'cơ học', 'quang học', 'điện từ'],
      [SubjectDomain.CHEMISTRY]: ['hóa học', 'chemistry', 'phản ứng', 'nguyên tố'],
      [SubjectDomain.BIOLOGY]: ['sinh học', 'biology', 'tế bào', 'di truyền'],
      [SubjectDomain.COMPUTER_SCIENCE]: ['lập trình', 'coding', 'AI', 'algorithm', 'máy tính'],
      [SubjectDomain.MUSIC]: ['âm nhạc', 'music', 'nhạc cụ', 'hòa âm'],
      [SubjectDomain.ART]: ['nghệ thuật', 'art', 'vẽ', 'thiết kế'],
      [SubjectDomain.LANGUAGE]: ['ngôn ngữ', 'language', 'tiếng anh', 'văn học'],
      [SubjectDomain.HISTORY]: ['lịch sử', 'history'],
      [SubjectDomain.GEOGRAPHY]: ['địa lý', 'geography'],
      [SubjectDomain.ECONOMICS]: ['kinh tế', 'economics', 'thương mại'],
      [SubjectDomain.PHILOSOPHY]: ['triết học', 'philosophy', 'tư duy'],
    };

    const allText = [...goals, ...interests].join(' ').toLowerCase();
    const domains: SubjectDomain[] = [];

    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        domains.push(domain as SubjectDomain);
      }
    });

    // Default to primary domains if none found
    if (domains.length === 0) {
      domains.push(SubjectDomain.MATH, SubjectDomain.COMPUTER_SCIENCE);
    }

    return domains;
  }

  /**
   * Select relevant knowledge nodes based on domains and student profile
   */
  private selectRelevantNodes(
    knowledgeGraph: KnowledgeNode[],
    domains: SubjectDomain[],
    studentProfile: AICoordinatorContext['studentProfile']
  ): KnowledgeNode[] {
    // Filter nodes by domain
    let relevantNodes = knowledgeGraph.filter(node =>
      domains.includes(node.domain) || 
      node.relatedDomains.some(d => domains.includes(d))
    );

    // Sort by student's strengths/weaknesses
    relevantNodes = relevantNodes.sort((a, b) => {
      const aScore = this.calculateNodeRelevanceScore(a, studentProfile);
      const bScore = this.calculateNodeRelevanceScore(b, studentProfile);
      return bScore - aScore;
    });

    return relevantNodes;
  }

  /**
   * Calculate how relevant a node is to student
   */
  private calculateNodeRelevanceScore(
    node: KnowledgeNode,
    studentProfile: AICoordinatorContext['studentProfile']
  ): number {
    let score = 50; // Base score

    // Boost if in student's strength domain
    if (studentProfile.strengths.includes(node.domain)) {
      score += 20;
    }

    // Adjust for difficulty based on strengths/weaknesses
    if (studentProfile.strengths.includes(node.domain)) {
      score += Math.min(10, node.difficulty); // Higher difficulty OK
    } else if (studentProfile.weaknesses.includes(node.domain)) {
      score -= Math.max(0, node.difficulty - 5); // Prefer easier
    }

    // Boost if related to interests
    const nodeText = `${node.title} ${node.content.description}`.toLowerCase();
    const interestBoost = studentProfile.interests.filter(interest =>
      nodeText.includes(interest.toLowerCase())
    ).length * 10;
    score += interestBoost;

    return score;
  }

  /**
   * Segment learning path by domain
   */
  private segmentPathByDomain(
    nodes: KnowledgeNode[],
    domains: SubjectDomain[],
    context: AICoordinatorContext
  ): LearningPathSegment[] {
    const segments: LearningPathSegment[] = [];

    domains.forEach(domain => {
      const domainNodes = nodes.filter(n => n.domain === domain);
      
      if (domainNodes.length === 0) return;

      // Sort by prerequisites and difficulty
      const orderedNodes = this.topologicalSort(domainNodes);

      const segment: LearningPathSegment = {
        id: `segment_${domain}_${Date.now()}`,
        studentId: context.studentId,
        domain,
        nodes: orderedNodes.map(n => n.id),
        mentorId: '', // Will be assigned later
        status: 'pending',
        progress: 0,
        startDate: new Date(),
        estimatedEndDate: this.calculateEndDate(orderedNodes),
        transitions: [],
      };

      segments.push(segment);
    });

    return segments;
  }

  /**
   * Topological sort of nodes based on prerequisites
   */
  private topologicalSort(nodes: KnowledgeNode[]): KnowledgeNode[] {
    const sorted: KnowledgeNode[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const visit = (node: KnowledgeNode) => {
      if (visited.has(node.id)) return;
      
      // Visit prerequisites first
      node.prerequisites.forEach(preqId => {
        const preq = nodeMap.get(preqId);
        if (preq) visit(preq);
      });

      visited.add(node.id);
      sorted.push(node);
    };

    nodes.forEach(node => visit(node));
    return sorted;
  }

  /**
   * Calculate estimated end date based on nodes
   */
  private calculateEndDate(nodes: KnowledgeNode[]): Date {
    const totalMinutes = nodes.reduce((sum, n) => sum + n.estimatedTime, 0);
    const days = Math.ceil(totalMinutes / (60 * 2)); // 2 hours per day
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate;
  }

  /**
   * Identify cross-domain transitions
   */
  private identifyCrossDomainTransitions(
    segments: LearningPathSegment[],
    nodes: KnowledgeNode[]
  ): PathTransition[] {
    const transitions: PathTransition[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    segments.forEach(segment => {
      segment.nodes.forEach((nodeId, index) => {
        const node = nodeMap.get(nodeId);
        if (!node) return;

        // Check if this node has cross-domain connections
        node.relatedDomains.forEach(relatedDomain => {
          if (relatedDomain === node.domain) return;

          // Find related segment
          const relatedSegment = segments.find(s => s.domain === relatedDomain);
          if (!relatedSegment) return;

          // Find suitable node in related segment
          const toNode = relatedSegment.nodes
            .map(id => nodeMap.get(id))
            .find(n => n && this.areNodesRelated(node, n));

          if (toNode) {
            const transition: PathTransition = {
              fromNodeId: nodeId,
              toNodeId: toNode.id,
              fromDomain: node.domain,
              toDomain: toNode.domain,
              transitionType: this.determineTransitionType(node, toNode),
              aiReasoning: this.generateTransitionReasoning(node, toNode),
              mentorApproval: {
                fromMentor: false,
                toMentor: false,
              },
            };

            transitions.push(transition);
          }
        });
      });
    });

    return transitions;
  }

  /**
   * Check if two nodes are related
   */
  private areNodesRelated(node1: KnowledgeNode, node2: KnowledgeNode): boolean {
    const text1 = `${node1.title} ${node1.content.description}`.toLowerCase();
    const text2 = `${node2.title} ${node2.content.description}`.toLowerCase();

    // Simple keyword matching (can be enhanced with NLP)
    const keywords1 = text1.split(/\s+/);
    const keywords2 = text2.split(/\s+/);

    const commonKeywords = keywords1.filter(k => 
      k.length > 3 && keywords2.includes(k)
    );

    return commonKeywords.length >= 2;
  }

  /**
   * Determine transition type
   */
  private determineTransitionType(
    fromNode: KnowledgeNode,
    toNode: KnowledgeNode
  ): PathTransition['transitionType'] {
    if (toNode.prerequisites.includes(fromNode.id)) {
      return 'prerequisite';
    }

    if (fromNode.difficulty < toNode.difficulty) {
      return 'bridge';
    }

    if (Math.abs(fromNode.difficulty - toNode.difficulty) <= 2) {
      return 'application';
    }

    return 'enrichment';
  }

  /**
   * Generate reasoning for transition
   */
  private generateTransitionReasoning(
    fromNode: KnowledgeNode,
    toNode: KnowledgeNode
  ): string {
    return `Chuyển từ "${fromNode.title}" (${fromNode.domain}) sang "${toNode.title}" (${toNode.domain}) giúp học sinh hiểu được mối liên hệ giữa các lĩnh vực và áp dụng kiến thức vào thực tế.`;
  }

  /**
   * Assign mentors to segments using AI matching
   */
  private async assignMentorsToSegments(
    segments: LearningPathSegment[],
    availableMentors: SubjectMentor[]
  ): Promise<MentorAssignment[]> {
    const assignments: MentorAssignment[] = [];

    for (const segment of segments) {
      const suitableMentors = availableMentors.filter(m => 
        m.domain === segment.domain && m.availability !== 'offline'
      );

      if (suitableMentors.length === 0) {
        console.warn(`⚠️ [AI-Coordinator] No available mentor for domain: ${segment.domain}`);
        continue;
      }

      // Calculate match score for each mentor
      const mentorScores = suitableMentors.map(mentor => ({
        mentor,
        score: this.calculateMentorMatchScore(mentor, segment),
      }));

      // Sort by score and select best
      mentorScores.sort((a, b) => b.score - a.score);
      const bestMatch = mentorScores[0];

      segment.mentorId = bestMatch.mentor.id;

      const assignment: MentorAssignment = {
        mentorId: bestMatch.mentor.id,
        segmentId: segment.id,
        assignedAt: new Date(),
        reason: `Mentor phù hợp nhất với effectiveness ${bestMatch.mentor.effectiveness}% và workload hiện tại ${bestMatch.mentor.assignmentCount}`,
        workload: bestMatch.mentor.assignmentCount,
        matchScore: bestMatch.score,
      };

      assignments.push(assignment);

      console.log(`👨‍🏫 [AI-Coordinator] Assigned ${bestMatch.mentor.name} to ${segment.domain} segment (score: ${bestMatch.score})`);
    }

    return assignments;
  }

  /**
   * Calculate mentor match score
   */
  private calculateMentorMatchScore(
    mentor: SubjectMentor,
    segment: LearningPathSegment
  ): number {
    let score = 0;

    // Effectiveness (0-40 points)
    score += (mentor.effectiveness / 100) * 40;

    // Workload (0-30 points, fewer assignments = higher score)
    const workloadScore = Math.max(0, 30 - (mentor.assignmentCount * 3));
    score += workloadScore;

    // Response time (0-20 points, faster = higher score)
    const responseScore = Math.max(0, 20 - mentor.responseTime);
    score += responseScore;

    // Availability (0-10 points)
    if (mentor.availability === 'available') score += 10;
    else if (mentor.availability === 'busy') score += 5;

    return score;
  }

  /**
   * Generate initial AI insights
   */
  private generateInitialInsights(
    segments: LearningPathSegment[],
    transitions: PathTransition[]
  ): AICoordinatorInsight[] {
    const insights: AICoordinatorInsight[] = [];

    // Insight about path structure
    insights.push({
      id: `insight_${Date.now()}_1`,
      timestamp: new Date(),
      type: 'recommendation',
      priority: 'medium',
      message: `Lộ trình học bao gồm ${segments.length} phân đoạn thuộc ${segments.length} lĩnh vực khác nhau`,
      reasoning: `Đây là lộ trình đa ngành, cần sự phối hợp giữa các giáo viên chuyên môn`,
      affectedSegments: segments.map(s => s.id),
      suggestedMentors: segments.map(s => s.mentorId),
      actionRequired: false,
    });

    // Insights about transitions
    if (transitions.length > 0) {
      insights.push({
        id: `insight_${Date.now()}_2`,
        timestamp: new Date(),
        type: 'alert',
        priority: 'high',
        message: `Phát hiện ${transitions.length} điểm chuyển đổi liên ngành cần xác nhận`,
        reasoning: `Các điểm chuyển đổi này cần sự đồng thuận từ giáo viên cả hai lĩnh vực`,
        affectedSegments: [...new Set(transitions.flatMap(t => [t.fromNodeId, t.toNodeId]))],
        suggestedMentors: [],
        actionRequired: true,
      });
    }

    return insights;
  }

  /**
   * Select panel mentors for cross-disciplinary review
   */
  private selectPanelMentors(
    domains: SubjectDomain[],
    availableMentors: SubjectMentor[]
  ): string[] {
    const panelMentors: string[] = [];

    // Select one mentor per domain
    domains.forEach(domain => {
      const domainMentors = availableMentors.filter(m => m.domain === domain);
      if (domainMentors.length > 0) {
        // Select most experienced (highest effectiveness)
        const bestMentor = domainMentors.reduce((best, current) =>
          current.effectiveness > best.effectiveness ? current : best
        );
        panelMentors.push(bestMentor.id);
      }
    });

    return panelMentors;
  }

  /**
   * Generate path title
   */
  private generatePathTitle(goals: string[], domains: SubjectDomain[]): string {
    if (goals.length > 0) {
      return `Lộ trình: ${goals[0]}`;
    }

    const domainNames = domains.map(d => this.getDomainDisplayName(d));
    return `Lộ trình đa ngành: ${domainNames.join(' & ')}`;
  }

  /**
   * Generate path description
   */
  private generatePathDescription(goals: string[], domains: SubjectDomain[]): string {
    const domainNames = domains.map(d => this.getDomainDisplayName(d));
    return `Lộ trình học tập tích hợp kiến thức từ ${domainNames.join(', ')}. ${goals.join('. ')}`;
  }

  /**
   * Get display name for domain
   */
  private getDomainDisplayName(domain: SubjectDomain): string {
    const names: Record<SubjectDomain, string> = {
      [SubjectDomain.MATH]: 'Toán học',
      [SubjectDomain.PHYSICS]: 'Vật lý',
      [SubjectDomain.CHEMISTRY]: 'Hóa học',
      [SubjectDomain.BIOLOGY]: 'Sinh học',
      [SubjectDomain.COMPUTER_SCIENCE]: 'Tin học',
      [SubjectDomain.MUSIC]: 'Âm nhạc',
      [SubjectDomain.ART]: 'Nghệ thuật',
      [SubjectDomain.LANGUAGE]: 'Ngôn ngữ',
      [SubjectDomain.HISTORY]: 'Lịch sử',
      [SubjectDomain.GEOGRAPHY]: 'Địa lý',
      [SubjectDomain.ECONOMICS]: 'Kinh tế',
      [SubjectDomain.PHILOSOPHY]: 'Triết học',
    };

    return names[domain] || domain;
  }

  /**
   * Monitor student progress and trigger AI interventions
   */
  async monitorAndIntervene(
    path: MultiDisciplinaryPath,
    currentNodeId: string
  ): Promise<AICoordinatorInsight[]> {
    const insights: AICoordinatorInsight[] = [];

    // Check if approaching transition
    const upcomingTransitions = this.findUpcomingTransitions(path, currentNodeId);
    
    if (upcomingTransitions.length > 0) {
      upcomingTransitions.forEach(transition => {
        insights.push({
          id: `insight_${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          type: 'transition',
          priority: 'high',
          message: `Học sinh sắp chuyển từ ${transition.fromDomain} sang ${transition.toDomain}`,
          reasoning: transition.aiReasoning,
          affectedSegments: [transition.fromNodeId, transition.toNodeId],
          suggestedMentors: this.getMentorsForTransition(path, transition),
          actionRequired: true,
        });
      });
    }

    return insights;
  }

  /**
   * Find upcoming transitions
   */
  private findUpcomingTransitions(
    path: MultiDisciplinaryPath,
    currentNodeId: string
  ): PathTransition[] {
    const allTransitions = path.segments.flatMap(s => s.transitions);
    return allTransitions.filter(t => t.fromNodeId === currentNodeId);
  }

  /**
   * Get mentors involved in transition
   */
  private getMentorsForTransition(
    path: MultiDisciplinaryPath,
    transition: PathTransition
  ): string[] {
    const mentors: string[] = [];

    const fromSegment = path.segments.find(s => s.domain === transition.fromDomain);
    const toSegment = path.segments.find(s => s.domain === transition.toDomain);

    if (fromSegment) mentors.push(fromSegment.mentorId);
    if (toSegment) mentors.push(toSegment.mentorId);

    return [...new Set(mentors)];
  }
}

// Export singleton
export const aiCoordinator = new AICoordinator();

