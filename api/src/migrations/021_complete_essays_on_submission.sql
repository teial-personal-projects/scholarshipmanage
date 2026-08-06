-- Migration 021: Complete unfinished essays when an application is submitted

CREATE OR REPLACE FUNCTION public.complete_essays_on_application_submission()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.essays
  SET status = 'completed'
  WHERE application_id = NEW.id
    AND status IS DISTINCT FROM 'completed';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complete_essays_on_application_submission
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'Submitted' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.complete_essays_on_application_submission();
