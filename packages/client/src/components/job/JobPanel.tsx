import { useState, useEffect } from 'react';
import { Briefcase, DollarSign, Zap, Heart, Loader2 } from 'lucide-react';
import type { AgentInfo } from '../../lib/types';
import { job, economy } from '../../services/api';
import type { Job } from '@lore/shared';
import './job-panel.css';

const jobCategories = [
  { id: 'fulltime', name: '全职', icon: '💼' },
  { id: 'parttime', name: '兼职', icon: '⏰' },
  { id: 'freelance', name: '自由', icon: '🎨' },
  { id: 'intern', name: '实习', icon: '🎓' },
];

interface JobPanelProps {
  agent?: AgentInfo;
  onApply?: (job: Job) => void;
  onQuit?: () => void;
}

export function JobPanel({ agent, onApply, onQuit }: JobPanelProps) {
  const [activeCategory, setActiveCategory] = useState('fulltime');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [income, setIncome] = useState(0);

  const currentOccupation = agent?.profile?.occupation ?? '无业';
  const hasJob = currentOccupation !== '无业' && currentOccupation !== '学生' && currentOccupation !== '退休';

  useEffect(() => {
    job.list().then(data => {
      setJobs(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (agent?.id) {
      economy.get(agent.id).then(data => {
        setIncome(data.income ?? 0);
      }).catch(() => {});
    }
  }, [agent]);

  const filteredJobs = jobs.filter(job => job.category === activeCategory);

  const formatSalary = (job: Job): string => {
    const freqLabels: Record<string, string> = {
      daily: '/天',
      weekly: '/周',
      monthly: '/月',
    };
    return `${job.salary}${freqLabels[job.salaryFrequency]}`;
  };

  const handleApply = async () => {
    if (!selectedJob || !agent?.id) return;
    
    setLoading(true);
    try {
      const result = await job.apply(agent.id, selectedJob.id);
      if (result.success) {
        setIncome(result.job.salary);
        onApply?.(selectedJob);
        setSelectedJob(null);
      }
    } catch (error) {
      console.error('Apply job failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuit = async () => {
    if (!agent?.id) return;
    
    setLoading(true);
    try {
      await job.quit(agent.id);
      setIncome(0);
      onQuit?.();
    } catch (error) {
      console.error('Quit job failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-panel">
      <div className="job-panel-header">
        <h3 className="job-panel-title">工作</h3>
        <div className="job-panel-status">
          {hasJob ? '已就业' : '待业'}
        </div>
      </div>

      {hasJob && (
        <div className="job-current-info">
          <div className="job-current-title">当前工作</div>
          <div className="job-current-name">{currentOccupation}</div>
          <div className="job-current-salary">
            <DollarSign size={14} />
            <span className="job-current-salary-value">
              {income}/月
            </span>
          </div>
        </div>
      )}

      {!hasJob && (
        <>
          <div className="job-category-tabs hide-scrollbar">
            {jobCategories.map(cat => (
              <button
                key={cat.id}
                className={`job-category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          <div className="job-list">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className={`job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="job-card-header">
                  <span className="job-card-name">{job.name}</span>
                  <span className="job-card-type">{job.category}</span>
                </div>
                <div className="job-card-details">
                  <div className="job-card-detail positive">
                    <DollarSign size={14} />
                    {formatSalary(job)}
                  </div>
                  <div className="job-card-detail negative">
                    <Zap size={14} />
                    -{job.energyCost}
                  </div>
                  {job.moodEffect !== 0 && (
                    <div className={`job-card-detail ${job.moodEffect > 0 ? 'positive' : 'negative'}`}>
                      <Heart size={14} />
                      {job.moodEffect > 0 ? '+' : ''}{job.moodEffect}
                    </div>
                  )}
                </div>
                {job.description && (
                  <div className="job-card-desc">{job.description}</div>
                )}
              </div>
            ))}
          </div>

          {selectedJob && (
            <div className="job-actions">
              <button className="job-action-btn secondary" onClick={() => setSelectedJob(null)}>
                取消
              </button>
              <button className="job-action-btn primary" onClick={handleApply} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : '申请工作'}
              </button>
            </div>
          )}
        </>
      )}

      {hasJob && (
        <div className="job-actions">
          <button className="job-action-btn secondary" onClick={handleQuit} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : '辞职'}
          </button>
        </div>
      )}
    </div>
  );
}