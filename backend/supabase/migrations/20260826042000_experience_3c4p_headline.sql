-- 3C4P now leads with a one-line headline naming what was done and the result it
-- produced ("민원 유형 분류 매뉴얼 도입으로 하루 처리량 40% 향상"). The C/P columns are
-- JSONB so their internal shape changed without a migration; only this is new.
ALTER TABLE experience_3c4p
    ADD COLUMN IF NOT EXISTS headline TEXT;
