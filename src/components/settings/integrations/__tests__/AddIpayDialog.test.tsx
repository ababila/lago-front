import { act, cleanup, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode } from 'react'

import { EXISTING_CODE_ERROR_MESSAGE } from '~/core/form/existingCodeError'
import { IpayIntegrationDetailsFragment } from '~/generated/graphql'
import { AllTheProviders, render } from '~/test-utils'

import { useAddIpayDialog } from '../AddIpayDialog'

const mockDialogOpen = jest.fn()
const mockUpdate = jest.fn()
const mockGetProviderByCode = jest.fn()
const mockAdd = jest.fn()
const mockDelete = jest.fn()

jest.mock('~/components/dialogs/FormDialogOpeningDialog', () => ({
  useFormDialogOpeningDialog: () => ({ open: mockDialogOpen, close: jest.fn() }),
}))

// Identity translate so the surfaced error renders as its message key and can be
// asserted through the exported constant (never a raw translation literal).
jest.mock('~/hooks/core/useInternationalization', () => ({
  useInternationalization: () => ({ translate: (key: string) => key }),
}))

jest.mock('~/generated/graphql', () => ({
  ...jest.requireActual('~/generated/graphql'),
  useUpdateIpayPaymentProviderMutation: () => [mockUpdate],
  useGetProviderByCodeForIpayLazyQuery: () => [mockGetProviderByCode],
  useAddIpayPaymentProviderMutation: () => [mockAdd],
  useDeleteIpayIntegrationMutation: () => [mockDelete],
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <AllTheProviders>{children}</AllTheProviders>
)

const provider: IpayIntegrationDetailsFragment = {
  __typename: 'IpayProvider',
  id: 'ipay-provider-id',
  name: 'Test Integration',
  code: 'test_integration',
  secretKey: '••••••••…key',
  webhookSecret: 'webhook-secret',
  successRedirectUrl: null,
}

describe('useAddIpayDialog', () => {
  afterEach(cleanup)

  beforeEach(() => {
    jest.clearAllMocks()

    // Keep the dialog pending so the `.then` cleanup does not reset the form mid-test
    mockDialogOpen.mockImplementation(() => new Promise(() => {}))
  })

  describe('GIVEN the code is already taken by another provider', () => {
    const submitEditionWithTakenCode = async (): Promise<() => Promise<unknown>> => {
      mockGetProviderByCode.mockResolvedValue({
        data: { paymentProvider: { id: 'another-provider-id' } },
      })

      const { result } = renderHook(() => useAddIpayDialog(), { wrapper })

      act(() => {
        result.current.openAddIpayDialog({ provider })
      })

      const dialogProps = mockDialogOpen.mock.calls[0][0]

      await act(() => render(<>{dialogProps.children}</>))

      return dialogProps.form.submit
    }

    describe('WHEN submitting the dialog', () => {
      it('THEN surfaces the shared duplicate-code message under the code input', async () => {
        const submit = await submitEditionWithTakenCode()

        await act(async () => {
          await expect(submit()).rejects.toThrow()
        })

        expect(await screen.findByText(EXISTING_CODE_ERROR_MESSAGE)).toBeInTheDocument()
      })

      it('THEN does not call the update mutation', async () => {
        const submit = await submitEditionWithTakenCode()

        await act(async () => {
          await expect(submit()).rejects.toThrow()
        })

        expect(mockUpdate).not.toHaveBeenCalled()
      })
    })
  })

  describe('GIVEN a new i-pay connection', () => {
    const openAndFill = async ({
      secretKey,
      successRedirectUrl,
    }: {
      secretKey: string
      successRedirectUrl: string
    }): Promise<() => Promise<unknown>> => {
      mockGetProviderByCode.mockResolvedValue({ data: { paymentProvider: null } })

      const { result } = renderHook(() => useAddIpayDialog(), { wrapper })

      act(() => {
        result.current.openAddIpayDialog()
      })

      const dialogProps = mockDialogOpen.mock.calls[0][0]

      await act(() => render(<>{dialogProps.children}</>))

      const user = userEvent.setup()

      await user.type(screen.getByPlaceholderText('text_6584550dc4cec7adf861504f'), 'My i-pay')
      await user.type(screen.getByPlaceholderText('text_1793114148166rt4bqcxsifr'), secretKey)
      await user.type(
        screen.getByPlaceholderText('text_1733303818769298k0fvsgcz'),
        successRedirectUrl,
      )

      return dialogProps.form.submit
    }

    describe('WHEN the secret key is not an i-pay secret key', () => {
      it('THEN shows the expected format and does not create the connection', async () => {
        const submit = await openAndFill({
          secretKey: 'pk_live_123',
          successRedirectUrl: 'https://example.com/return',
        })

        await act(async () => {
          await expect(submit()).rejects.toThrow()
        })

        expect(await screen.findByText('text_1793117191354vyh19f9k8yf')).toBeInTheDocument()
        expect(mockAdd).not.toHaveBeenCalled()
      })
    })

    describe('WHEN the redirect URL is not https', () => {
      it('THEN asks for https and does not create the connection', async () => {
        const submit = await openAndFill({
          secretKey: 'sk_sandbox_123',
          successRedirectUrl: 'http://example.com/return',
        })

        await act(async () => {
          await expect(submit()).rejects.toThrow()
        })

        expect(await screen.findByText('text_1793117191354pipj9icikqq')).toBeInTheDocument()
        expect(mockAdd).not.toHaveBeenCalled()
      })
    })

    describe('WHEN the pasted secret key has surrounding spaces', () => {
      it('THEN creates the connection with the trimmed key', async () => {
        mockAdd.mockResolvedValue({})

        const submit = await openAndFill({
          secretKey: ' sk_live_123 ',
          successRedirectUrl: 'https://example.com/return',
        })

        await act(async () => {
          await submit().catch(() => undefined)
        })

        expect(mockAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: { input: expect.objectContaining({ secretKey: 'sk_live_123' }) },
          }),
        )
      })
    })
  })
})
